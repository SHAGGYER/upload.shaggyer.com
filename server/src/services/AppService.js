const shell = require("shelljs");
const util = require("util");
const fs = require("fs");
const getPort = require("get-port");
const randomWords = require("random-words");
const {spawnSync, spawn} = require("child_process")

const shellPromise = util.promisify(shell.exec);

let userIds = [];
let buildCommands = [];

exports.AppService = class {
  runIoServer(socket, socketServer) {
    socket.on("join-user", (userId) => {
      socket.join(userId);
      userIds = userIds.filter((x) => x !== userId);
      userIds.push(userId);
    });

    socket.on("user-terminate", (data) => {
      const buildCommand = buildCommands.find((x) => x.userId === data.userId);
      buildCommand.terminatedByUser = true;
      buildCommand.child.kill();
    });

    socket.on("install-app", async ({app, userId}) => {
      const subdomain = randomWords({exactly: 3, join: "-"});

      if (process.env.NODE_ENV !== "dev") {
        switch (app.language) {
          case "php":
            await this.installLaravelAppDocker(
              subdomain,
              app,
              socket,
              socketServer,
              userId
            );
            break;
        }
      } else {
        let count = 0;
        let time = 0;
        const timeInterval = setInterval(() => {
          time++;
        }, 1000);

        const interval = setInterval(() => {
          let text = "Working...";
          if (count === 50) {
            clearInterval(interval);
            clearInterval(timeInterval);
            count = 0;
            socketServer.to(userId).emit("app-installation-done", subdomain);
            socketServer.to(userId).emit("installation-progress", {
              text: "Installed with success.",
              count,
              time,
              intermediateStep: "Laravel app installed successfully",
            });
            return;
          }

          count++;

          socketServer.to(userId).emit("installation-progress", {
            text,
            count,
            time,
            intermediateStep: "Installing",
          });
        }, 200);
      }
    });
  }

  async finish() {
    if (process.env.NODE_ENV === "dev") return;

    await shellPromise(`service nginx reload`);
  }

  installGithubRepo = (subdomain, {token, username, repo}) => {
    const tarballName = randomWords({exactly:  3, join: "_"})
    if (process.env.NODE_ENV === "dev") return false;
    const serverCommand = `cd ${process.env.APPS_DIR} && ./get-github-repo.sh ${token} ${username} ${repo} ${tarballName}`
    spawnSync(serverCommand, {shell: "/bin/bash"});
    return tarballName
  };

  installLaravelAppDocker = async (
    subdomain,
    {token, username, repo, laravelVersion, environmentVariables},
    socket,
    socketServer,
    userId,

  ) => {
    const tarballName = this.installGithubRepo(subdomain, {token, username, repo});

    const databaseName = subdomain.split("-").join("_");
    const port = await getPort();

/*    let envArgs = [];
    if (environmentVariables.trim()) {
      environmentVariables.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        envArgs.push(`RUN echo "${key}=${value}" >> .env`);
      });
    }*/

    let commands = []

    if (laravelVersion == 7) {
      commands = [
        "FROM miko1991/miko-php:v1",
        `COPY ${tarballName}.gz .`,
        `RUN echo "Unpacking files..." && bsdtar --strip-components=1 -xvf ${tarballName}.gz -C . > /dev/null 2>&1`,
        `RUN FILE=composer.json && if [ ! -e $FILE ]; then echo "File composer.json not found" && exit 3; fi;`,
        `RUN LARAVEL_FRAMEWORK=$(grep -m1 laravel/framework composer.json || echo "") && \
            if [ -z "$LARAVEL_FRAMEWORK" ]; \
            then sleep 1 && echo "Could not find Laravel Framework" && exit 2; fi; \
            PACKAGE_VERSION=$(echo $LARAVEL_FRAMEWORK | awk -F: '{ print $2 }' | sed 's/[", ]//g' | sed -E -e 's/(~|\\^|.\\*)//g') && \
            echo "{PHP_STATUS=Verifying Laravel version...}" && \
            if [ -z "$PACKAGE_VERSION" ]; \
            then sleep 1 && echo "Could not detect Laravel version" && exit 2; \
            else sleep 1 && echo "Detected Laravel Framework version: $PACKAGE_VERSION" && sleep 2; fi; \
            if $(dpkg --compare-versions "$PACKAGE_VERSION" "lt" "7.2.5"); \
            then echo "Your version of Laravel ($PACKAGE_VERSION) is below 7.2.5" && exit 2; fi`,
        "RUN chmod -R 777 storage/",
        `RUN echo "{PHP_STATUS=Installing Laravel app...}" && sleep 1 && echo "Installing Laravel..." && composer install > /dev/null 2>&1`,
        `RUN echo "{PHP_STATUS=Populating environment variables...}" && touch .env`,
        `RUN echo "APP_KEY=" >> .env`,
        `RUN echo "APP_ENV=dev" >> .env`,
        `RUN echo "APP_URL=https://${subdomain}.shaggyer.com" >> .env`,
        `RUN echo "DB_CONNECTION=mysql" >> .env`,
        `RUN echo "DB_HOST=mysql" >> .env`,
        `RUN echo "DB_DATABASE=${databaseName}" >> .env`,
        `RUN echo "DB_USERNAME=root" >> .env`,
        `RUN echo "DB_PASSWORD=" >> .env`,
        `RUN echo "DB_PORT=3306" >> .env`,
        `RUN php artisan key:generate`,
      ]
    } else if (laravelVersion == 8) {
      commands = [
        "FROM miko-php-8:v1",
        `COPY ${tarballName}.gz .`,
        `RUN echo "Unpacking files..." && bsdtar --strip-components=1 -xvf ${tarballName}.gz -C . > /dev/null 2>&1`,
        `RUN FILE=composer.json && if [ ! -e $FILE ]; then echo "File composer.json not found" && exit 3; fi;`,
        "RUN chmod -R 777 storage/",
        "RUN composer install --optimize-autoloader --no-dev",
        "RUN cd /var/www/ && cp .env.example .env && php artisan key:generate",
        "EXPOSE 80",
        `ENTRYPOINT ["/var/www/docker/run.sh"]`
      ]
    }

    const steppableCommands = {
      createDatabase: async () => {
        spawnSync(
          `docker exec -i mysql mysql <<< "create database ${databaseName};"`,
          {shell: "/bin/bash"}
        );
      },
      launchApp: async () => {
        await shellPromise(
          `docker run -d --name ${tarballName} -p ${port}:80 --network my-network ${tarballName}:v1`
        );
      },
      migrateDatabase: async () => {
        await shellPromise(
          `docker exec -i ${tarballName} php artisan migrate --seed`
        );
      },
    };

    const totalSteps = commands.length + Object.keys(steppableCommands).length;
    socketServer.to(userId).emit("installation-began", {totalSteps});

    socketServer
      .to(userId)
      .emit("installation-progress", {intermediateStep: "Initializing..."});
    await shellPromise(
      `cd ${process.env.APPS_DIR} && mkdir ${tarballName} && cp ${tarballName}.gz ${tarballName}`
    );

    const serverContent = `
server { 
  listen 80; 
  listen [::]:80; 
  server_name ${subdomain}.shaggyer.com; 
  return 301 https://$host$request_uri; 
}
server {
    listen 443 ssl; 
    server_name ${subdomain}.shaggyer.com; 
    ssl_certificate /etc/letsencrypt/live/shaggyer.com/fullchain.pem; 
    ssl_certificate_key /etc/letsencrypt/live/shaggyer.com/privkey.pem; 
    include /etc/letsencrypt/options-ssl-nginx.conf; 
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; 
    
    location / {
        proxy_pass http://localhost:${port};
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
    fs.writeFileSync(subdomain, serverContent);
    await shellPromise(
      `mv ${subdomain} ${process.env.NGINX_SITES_DIR}/${subdomain}`
    );

    const dockerFile = commands.join("\n");

    fs.writeFileSync(subdomain + "_Dockerfile", dockerFile);
    await shellPromise(
      `mv ${subdomain}_Dockerfile ${process.env.APPS_DIR}/${tarballName}/Dockerfile`,
    );

    socketServer
      .to(userId)
      .emit("installation-progress", {intermediateStep: "Building..."});
    const child = spawn(
      `cd ${process.env.APPS_DIR}/${tarballName} && docker build -t ${tarballName}:v1 .`,
      {shell: "/bin/bash"}
    );
    buildCommands.push({
      child,
      terminatedByUser: false,
      userId: userId,
    });

    let count = 0;
    let time = 0;
    const timeInterval = setInterval(() => {
      time++;
      socketServer.to(userId).emit("installation-progress", {time});
    }, 1000);
    let interval = setInterval(() => {
      socketServer
        .to(userId)
        .emit("installation-progress", {totalSteps, count});
    }, 300);

    let re = /{PHP_STATUS=(.*)}/i;
    let lastText = undefined;
    child.stdout.on("data", (data) => {
      let intermediateStep = "";
      const strData = data.toString();
      let text = strData;

      if (strData.includes("Step")) {
        count++;
        text = undefined;
      }

      if (strData.includes("Running") ||
        strData.includes("Removing") ||
        strData.includes("--->") ||
        strData.includes("Successfully") ||
        strData.includes("Sending")) {
        if (lastText === "Working...") {
          text = undefined;
        } else {
          text = "Working...";
        }
      }
      let found = strData.match(re);

      if (found && found[1]) {
        intermediateStep = found[1];
        text = undefined;
      }

      if (text) {
        lastText = text;
      }

      socketServer
        .to(userId)
        .emit("installation-progress", {text, count, intermediateStep});
    });

    const buildCommand = buildCommands.find((x) => x.userId === userId);
    child.on("error", e => console.log(e));
    child.on("exit", async (code) => {
      if (buildCommand && buildCommand.terminatedByUser) {
        clearInterval(timeInterval);
        clearInterval(interval);
        spawnSync(
          `cd ${process.env.APPS_DIR} && rm -rf ${tarballName} && rm ${tarballName}.gz`,
          {shell: "/bin/bash"}
        );
        socketServer.to(userId).emit("installation-progress", {
          intermediateStep: "Terminated by user...",
          terminatedByUser: true,
          text: "Terminated by user...",
        });
      } else if (code && code > 0) {
        clearInterval(timeInterval);
        clearInterval(interval);
      /*  spawnSync(
          `cd ${process.env.APPS_DIR} && rm -rf ${tarballName} && rm ${tarballName}.gz`,
          {shell: "/bin/bash"}
        );*/
        socketServer.to(userId).emit("installation-progress", {
          intermediateStep: "Installation failed...",
          text: "Sorry, installation failed.",
          count,
          time,
          failed: true,
        });
      } else {
        count++;
        socketServer.to(userId).emit("installation-progress", {
          intermediateStep: "Creating database...",
          text: "Creating database...",
          count,
        });
        await steppableCommands.createDatabase();

        count++;
        socketServer.to(userId).emit("installation-progress", {
          intermediateStep: "Launching app...",
          text: "Launching app...",
          count,
        });
        await steppableCommands.launchApp();

        count++;
        socketServer.to(userId).emit("installation-progress", {
          intermediateStep: "Migrating database...",
          text: "Migrating database...",
          count,
        });
        await steppableCommands.migrateDatabase();

        socketServer.to(userId).emit("installation-progress", {
          intermediateStep: "Finished successfully...",
          text: "Finished successfully...",
        });
        await this.finish();
        clearInterval(interval);
        clearInterval(timeInterval);
        socketServer.to(userId).emit("app-installation-done", subdomain);
      }
      buildCommands = buildCommands.filter((x) => x.userId !== userId);
    });
  };

}
