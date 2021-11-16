import React, {useContext, useEffect, useRef, useState} from "react";
import PublicContext from "../contexts/PublicContext"
import styled from "styled-components";
import {CustomDialog, StaticDialog, useDialog} from "react-st-modal";
import axios from "axios";

const ProgressContainer = styled.div`
  background-color: black;
  overflow-y: auto;
  color: white;
  padding: 0.5rem;
  min-height: 200px;
  max-height: 200px;
  font-family: monospace;
  word-break: break-all;

  & * {
    font-family: inherit !important;
  }
`;

const ProgressDialog = ({
                          progressCount,
                          progress,
                          progressTime,
                          intermediateStep,
                          failed,
                          close,
                          userTerminate,
                          terminatedByUser,
                          totalSteps,
                          installationComplete,
                          subdomain,
                        }) => {
  const {redirect} = useContext(PublicContext);

  const progressRef = useRef();
  useEffect(() => {
    if (progressRef.current) {
      const element = progressRef.current;
      element.scrollTop = element.scrollHeight - element.clientHeight;
    }
  }, [JSON.stringify(progress)]);

  return (
    <div style={{padding: "1rem"}}>
      <div style={{display: "grid", gridTemplateColumns: "50px 1fr", alignItems: "center", gap: "1rem"}}>
        {progressCount && totalSteps ? (
          <span
            style={{fontSize: "30px", display: "block", textAlign: "center"}}
          >
            {((progressCount / totalSteps) * 100).toFixed(0)}%
          </span>
        ) : (
          <div>
            <i
              className="fas fa-spinner fa-spin"
              style={{
                fontSize: "40px",
                display: "block",
                textAlign: "center",
              }}
            />
          </div>
        )}
        <div>
          <div
            style={{
              fontSize: "20px",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <i className="fas fa-chevron-right"></i>
            {intermediateStep}
          </div>
          <br/>
          <ProgressContainer ref={progressRef}>
            {progress && progress.map((p, index) => <p key={index}>{p}</p>)}
          </ProgressContainer>
          <p
            style={{
              marginTop: "0.5rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <i className="far fa-clock"></i>
            <span>
              Elapsed Time:{" "}
              {new Date(progressTime * 1000).toISOString().substr(11, 8)}
            </span>
          </p>
        </div>
      </div>
      <br/>

      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        {!installationComplete ? (
          <button
            disabled={terminatedByUser || failed}
            onClick={userTerminate}
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() =>
              redirect("https://" + subdomain + ".shaggyer.com", true)
            }
          >
            Show App
          </button>
        )}
        {(failed || terminatedByUser || installationComplete) && (
          <React.Fragment>
            <br/>
            <button onClick={close}>Exit</button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

const RepoDialog = ({repo}) => {
  const dialog = useDialog();


  const [environmentVariables, setEnvironmentVariables] = useState("");

  const installPhpApp = () => {
    dialog.close({
      environmentVariables,
      language: "php",
    });
  };

  return (
    <div style={{padding: "1rem"}}>
      {repo.language && repo.language === "PHP" && (
        <React.Fragment>
          <textarea
  name="environmentVariables"
  placeholder="Extra Environment Variables"
  onChange={(e) => setEnvironmentVariables(e.target.value)}
  />

          <button onClick={() => installPhpApp()}>
            Install
          </button>
        </React.Fragment>
      )}
    </div>
  );
};

export default function YourApps() {
  const {socket} =
    useContext(PublicContext);

  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState([]);
  const [subdomain, setSubdomain] = useState(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [progressTime, setProgressTime] = useState(0);
  const [installationStarted, setInstallationStarted] = useState(false);
  const [progress, setProgress] = useState([]);
  const [installationFailed, setInstallationFailed] = useState(false);
  const [intermediateStep, setIntermediateStep] = useState("");
  const [terminatedByUser, setTerminatedByUser] = useState(false);
  const [totalSteps, setTotalSteps] = useState(null);
  const [installationComplete, setInstallationComplete] = useState(false);


  const [githubAccessToken, setGithubAccessToken] = useState(localStorage.getItem("githubAccessToken"))
  const [githubUserName, setGithubUserName] = useState(localStorage.getItem("githubUsername"))


  const progressTimeRef = useRef();

  useEffect(() => {
    if (socket) {
      socket.on("installation-began", (data) => {
        setTotalSteps(data.totalSteps);
      });

      socket.on("app-installation-done", (x) => {
        setSubdomain(x);
        setLoading(false);
        setInstallationComplete(true);
        setInstallationStarted(false);
        clearTimeout(progressTimeRef.current);
        socket.off("installation-progress");
      });
    }
  }, [socket]);

  useEffect(() => {
    if (!progressDialogOpen) {
      setProgress([]);
      setProgressCount(0);
      setProgressTime(0);
      setTotalSteps(0);
      setTerminatedByUser(false);
      setIntermediateStep(null);
      setInstallationFailed(false);
      setInstallationStarted(false);
      setInstallationComplete(false);
    }
  }, [progressDialogOpen]);

  useEffect(() => {
    if (!installationStarted && socket) {
      setInstallationStarted(true);
      setInstallationFailed(false);

      let oldProgress = [];

      socket.on("installation-progress", (x) => {
        console.log("oldProgress", oldProgress);
        if (!progressDialogOpen) {
          setProgressDialogOpen(true);
        }
        if (x) {
          if (x.failed) {
            console.log("failed");
            setInstallationFailed(true);
            oldProgress.push(x.text);
            oldProgress.push("Cleaning up...");
            setProgress(oldProgress);
          } else if (x.terminatedByUser) {
            setTerminatedByUser(true);
            oldProgress.push(x.text);
            oldProgress.push("Cleaning up...");
            setProgress(oldProgress);
          } else if (x.text && x.text.length > 0) {
            oldProgress.push(x.text);
            setProgress(oldProgress);
          }

          if (x.count) {
            setProgressCount(x.count);
          }
          if (x.time) {
            setProgressTime(x.time);
          }
          if (x.intermediateStep) {
            setIntermediateStep(x.intermediateStep);
          }
          if (x.totalSteps) {
            setTotalSteps(x.totalSteps);
          }
        }
      });
    }
  }, [
    socket,
    installationStarted,
    progressDialogOpen,
    progressCount,
    progress,
  ]);

  const userTerminate = async () => {
    socket.emit("user-terminate", {
      userId: githubUserName,
    });
  };

  const installApp = async (event) => {
    event.preventDefault();
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("zip", file);

      const {data} = await HttpClient().post(
        "/api/apps/upload-zipped-website",
        formData
      );
      setSubdomain(data.subdomain);
    } catch (e) {
      console.log(e);
      if (e.status === 403) {
        setErrors(e.data.errors);
      }
    }
  };

  const getGithubRepos = async () => {
    const {data} = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: "token " + githubAccessToken,
      },
    });

    setGithubRepos(data);
  };

  const openRepoDialog = async (repo) => {
    const result = await CustomDialog(<RepoDialog repo={repo}/>, {
      className: "big-modal",
      isBodyScrollLocked: true,
    });
    if (!result) {
      return;
    }

    const app = {
      conf: result,
      data: {
        token: githubAccessToken,
        username: githubUserName,
        repo: repo.name,
      },
    };

    socket.emit("install-app", {app, userId: githubUserName});
    setLoading(true);
    setProgressDialogOpen(true);
  };

  return (
    <React.Fragment>
      <div>
        <div>
          <React.Fragment>
            <h2>Upload own app</h2>

            {githubAccessToken && (
              <button onClick={getGithubRepos}>
                Get Github Repos
              </button>
            )}

            {!!githubRepos.length && (
              <ul>
                {githubRepos.map((repo, index) => (
                  <li key={index}>
                    <div style={{display: "grid", gridTemplateColumns: "3fr 5fr 1fr"}}>
                      {repo.name}
                      <p style={{textAlign: "center"}}>
                        {repo.private ? "Private" : "Public"}
                      </p>
                      <button onClick={() => openRepoDialog(repo)}>
                        Install
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <StaticDialog
              isOpen={progressDialogOpen}
              title="Installation Progress"
              onAfterClose={(result) => {
                setProgressDialogOpen(true);
              }}
            >
              {/* see previous demo */}
              <ProgressDialog
                progress={progress}
                progressCount={progressCount}
                progressTime={progressTime}
                failed={installationFailed}
                intermediateStep={intermediateStep}
                close={() => setProgressDialogOpen(false)}
                userTerminate={userTerminate}
                terminatedByUser={terminatedByUser}
                totalSteps={totalSteps}
                installationComplete={installationComplete}
                subdomain={subdomain}
              />
            </StaticDialog>

            {/* <FlexBox
              justifyContent="center"
              direction="column"
              style={{ maxWidth: 500, margin: "0 auto" }}
            >
              <Alert primary>
                Upload a zip file containing your website. It must consist of
                .html, .css, .js, font files, and/or image files.
                <Spacer bottom="1rem"></Spacer>
                <Text block color="white">
                  If you are uploading a website made in Vue, React, Angular or
                  other frontend framework, you must first BUILD your app, then
                  zip the build folder (it must contain an index.html file), and
                  then upload the zip file.
                </Text>
                <Spacer bottom="1rem" />
                You will receive a custom subdomain on my server, for example:
                <br />
                your-app.mikolaj.dk
                <Spacer bottom="1rem" />
                Max file size: 30MB
              </Alert>
              {!!errors.length && (
                <Alert error>
                  <ul>
                    {errors.map((error, index) => (
                      <li key={index}>{error.error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              <form
                onSubmit={installApp}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <Spacer bottom="1rem" />
                <SecondaryButton type="submit">Upload</SecondaryButton>
              </form>


            </FlexBox>*/}
          </React.Fragment>
        </div>
      </div>
    </React.Fragment>
  );
}
