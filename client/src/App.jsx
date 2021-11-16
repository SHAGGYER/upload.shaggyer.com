import "./globals.css";
import React, {useEffect, useState} from "react";
import PublicContext from "./contexts/PublicContext";
import {Agent} from "./services/api";
import styled, {ThemeProvider, css} from "styled-components";
import cogoToast from "cogo-toast";
import io from "socket.io-client";
import YourApps from "./pages/upload";
import {useLocation, useNavigate} from "react-router-dom"
import queryString from "query-string"

const Wrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  position: relative;
`;

const Container = styled.section`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

function MyApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const {githubAccessToken, githubUsername} = queryString.parse(location.search);
  const [initialized, setInitialized] = useState(false);
  const [appSettings, setAppSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (githubUsername && githubAccessToken) {
      localStorage.setItem("githubAccessToken", githubAccessToken);
      localStorage.setItem("githubUsername", githubUsername)
      window.location.href = "/"
    }
  }, [githubUsername, githubAccessToken]);

  useEffect(() => {
    const githubAccessToken = localStorage.getItem("githubAccessToken");
    const githubUsername = localStorage.getItem("githubUsername");
    if (githubAccessToken) {
      const s = io(import.meta.env.VITE_APP_URL, {
        transports: ["websocket"],
      });

      s.emit("join-user", githubUsername);

      setSocket(s);
    }
  }, [])

  const login = async (token) => {
    localStorage.setItem("token", token);
    const user = await initialize();
    if (user) {
      cogoToast.success("You are now logged in");
    }
  };

  const redirect = async (path, external = false) => {
    if (!external) {
      navigate(path);

      setTimeout(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }, 0);
    } else {
      window.open(path, "_blank");
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <PublicContext.Provider
      value={{
        appSettings,
        redirect,
        user,
        setUser,
        logout,
        socket,
      }}
    >
      <Wrapper>

        <Container>
          <YourApps />
        </Container>
      </Wrapper>
    </PublicContext.Provider>
  );
}

export default MyApp;
