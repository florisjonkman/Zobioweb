import axios from "axios";
import Cookies from "js-cookie";
import forge from "node-forge";

const host = "http://192.168.60.12:8080"; // "http://localhost:5000" // "http://192.168.60.12:8080"

// Asynchronous function to login to LDAP of Zobio
export async function fetchCheckLDAP(username, password) {
  console.log("Fetching checking ldap account...");

  const publicKey = forge.pki.publicKeyFromPem(
    process.env.REACT_APP_PUBLIC_KEY
  );
  const encryptedPassword = publicKey.encrypt(password, "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: forge.mgf1.create(),
  });
  const base64 = forge.util.encode64(encryptedPassword);

  const request = await axios({
    url: host + "/login",
    method: "post",
    headers: {
      username: username,
      password: base64,
    },
  });

  return request;
}

// Asynchronous function to fetch all the projects in CDD Vault
export async function fetchProjects() {
  console.log("Fetching all projects...");
  const token = Cookies.get("token");

  const request = await axios({
    url: host + "/projects",
    method: "get",
    headers: { Token: token },
  });

  return request;
}

// Asynchronous function to send data to CDD Vault
export async function fetchSendData(type, data) {
  console.log("Fetching send data to CDD...");
  const token = Cookies.get("token");

  const request = await axios({
    url: host + "/submitdata",
    method: "post",
    headers: { Token: token },
    data: { type, data },
  });

  return request;
}

// Asynchronous function to fetch the last occupied postion of the selected project
export async function fetchPosition(type, barcode, selectedProject) {
  console.log("Fetching position...");
  const token = Cookies.get("token");

  const request = await axios({
    url: host + "/getlocation",
    method: "post",
    headers: { Token: token },
    data: { type: type, project: selectedProject, barcode: barcode },
  });

  return request;
}

// Asynchronous function to fetch the last occupied postion of the selected project
export async function fetchLastPosition(selectedProject) {
  if (selectedProject.value === 0) return;
  console.log("Fetching last position...");
  const token = Cookies.get("token");

  const request = await axios({
    url: host + "/getlastlocation",
    method: "post",
    headers: { Token: token },
    data: selectedProject,
  });

  return request;
}
