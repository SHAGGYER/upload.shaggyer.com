import { createContext } from "react";

const PublicContext = createContext({
  appSettings: null,
  user: null,
  setUser: () => {},
  socket: null,
  logout: () => {},
  redirect: (path, external) => {},
  isSidebarOpen: false,
  networkError: false,
  isMobile: false,

});

export default PublicContext;
