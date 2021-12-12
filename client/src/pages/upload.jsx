import React, {useContext, useEffect, useRef, useState} from "react";
import PublicContext from "../contexts/PublicContext"
import styled from "styled-components";
import {CustomDialog, StaticDialog, useDialog} from "react-st-modal";
import axios from "axios";

const Container = styled.section`
  border: 1px solid #ccc;
  padding: 1rem;
  width: 700px;
  max-width: 700px;
  margin: 2rem auto;
  
  > h2 {
    font-size: 40px;
    margin-bottom: 1rem;
  }
  
  > button {
    border: 1px solid black;
    padding: 0.5rem 1rem;
  }
  
  > a {
    text-decoration: none;
    color: black;
    border: 1px solid black;
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
  }
`

const SearchContainer = styled.div`
  input {
    padding: 1rem;
    width: 100%;
  }
`

const RepoList = styled.article`
  margin-top: 1rem;
  
  ${SearchContainer} {
    margin-bottom: 1rem;
  }
  
  ul {
    border: 1px solid #ccc;
    list-style: none;
    padding: 0;
    height: 500px;
    overflow-y: auto;

    li {
      border-bottom: 1px solid #ccc;
      padding: 1rem;
      display: grid;
      grid-template-columns: 4fr 1fr 1fr;
      justify-content: space-between;
      align-items: center;

      :last-child {
        border-bottom: none;
      }

      button {
        border: 1px solid black;
        padding: 0.5rem 1rem;
      }
    }
  }
`

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

const EnvVarsContainer = styled.div`
  width: 500px;
  
  textarea {
    padding: 0.5rem;
    width: 100%;
    height: 300px;
    resize: none;
    margin-bottom: 1rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: 1px solid black;
  }
`

const ProgressDialogElement = styled.section`
  button {
    padding: 0.5rem 1rem;
    border: 1px solid black;
  }
`

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
    <ProgressDialogElement style={{padding: "1rem"}}>
      <div style={{display: "grid", gridTemplateColumns: "50px 1fr", alignItems: "center", gap: "1rem"}}>
        {progressCount && totalSteps ? (
          <span
            style={{fontSize: "20px", display: "block", textAlign: "center"}}
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
            }}
          >
            <i className="fas fa-chevron-right"/>
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
            <i className="far fa-clock"/>
            <span>
              Elapsed Time:{" "}
              {new Date(progressTime * 1000).toISOString().substr(11, 8)}
            </span>
          </p>
          <div style={{display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "1rem"}}>
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
      </div>
      <br/>


    </ProgressDialogElement>
  );
};

const RepoDialog = ({repo}) => {
  const dialog = useDialog();


  const [environmentVariables, setEnvironmentVariables] = useState("");
  const [phpVersion, setPhpVersion] = useState("");

  const installPhpApp = () => {
    if (!phpVersion) return;

    dialog.close({
      environmentVariables,
      language: "php",
      phpVersion
    });
  };

  return (
    <EnvVarsContainer style={{padding: "1rem"}}>
      {repo.language && repo.language === "PHP" && (
        <React.Fragment>
          <div>
            <label>Laravel Version</label>
            <select style={{width: "100%", padding: "0.5rem"}} value={phpVersion} onChange={e => setPhpVersion(e.target.value)}>
              <option value="">Choose One</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>
          </div>
          <br/>
          <div>
            <label>Environment Variables</label>
            <textarea
              name="environmentVariables"
              placeholder="Extra Environment Variables"
              onChange={(e) => setEnvironmentVariables(e.target.value)}
            />
          </div>


          <button onClick={() => installPhpApp()}>
            Install
          </button>
        </React.Fragment>
      )}
    </EnvVarsContainer>
  );
};

export default function YourApps() {
  const {socket} =
    useContext(PublicContext);

  const [subdomain, setSubdomain] = useState(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [defaultGithubRepos, setDefaultGithubRepos] = useState([]);
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


  const githubAccessToken = localStorage.getItem("githubAccessToken")
  const githubUserName = localStorage.getItem("githubUsername")

  const [searchRepoText, setSearchRepoText] = useState("")



  const progressTimeRef = useRef();

  useEffect(() => {
    if (searchRepoText) {
      const newRepos = defaultGithubRepos.filter(x => x.name.includes(searchRepoText))
      setGithubRepos(newRepos)
    } else {
      setGithubRepos(defaultGithubRepos)
    }
  }, [searchRepoText])

  useEffect(() => {
    if (socket) {
      socket.on("installation-began", (data) => {
        setTotalSteps(data.totalSteps);
      });

      socket.on("app-installation-done", (x) => {
        setSubdomain(x);
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
        if (!progressDialogOpen) {
          setProgressDialogOpen(true);
        }
        if (x) {
          if (x.failed) {
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

  const getGithubRepos = async () => {
    const {data} = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: "token " + githubAccessToken,
      },
    });

    setGithubRepos(data);
    setDefaultGithubRepos(data);
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
      token: githubAccessToken,
      username: githubUserName,
      repo: repo.name,
      phpVersion: result.phpVersion,
      environmentVariables: result.environmentVariables,
      language: result.language
    };

    socket.emit("install-app", {app, userId: githubUserName});
    setProgressDialogOpen(true);
  };

  return (
    <React.Fragment>
      <Container>
        <h2>Upload own app</h2>

        {githubAccessToken ? (
          <button onClick={getGithubRepos}>
            Get Github Repos
          </button>
        ) : (
          <a href={import.meta.env.VITE_APP_URL+"/api/auth/github"}>Authenticate with Github</a>
        )}



        {!!githubRepos.length && (
          <RepoList>
            <SearchContainer>
              <input value={searchRepoText} onChange={e => setSearchRepoText(e.target.value)} type="text" placeholder="Search for repo" />
            </SearchContainer>
            <ul>
              {githubRepos.map((repo, index) => (
                <li key={index}>
                  <span>{repo.name}</span>
                  <span className="access">
                        {repo.private ? "Private" : "Public"}
                      </span>
                  <button onClick={() => openRepoDialog(repo)}>
                    Install
                  </button>
                </li>
              ))}
            </ul>
          </RepoList>
        )}

        <StaticDialog
          isOpen={progressDialogOpen}
          title="Installation Progress"
          onAfterClose={() => {
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

      </Container>
    </React.Fragment>
  );
}
