import HttpClient from "../HttpClient";

export class Auth {
  init = async (githubToken) => {
    try {
      const {data} = await HttpClient().get("/api/auth/init" + (githubToken ? "?githubToken=" + githubToken : ""));
      return data;
    } catch (e) {
      throw e;
    }
  };
}