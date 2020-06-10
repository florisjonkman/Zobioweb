import axios from "axios";
import Cookies from "js-cookie";

// Asynchronous function to fetch all the projects in CDD Vault
export async function fetchProjects() {
  console.log("Fetching all projects...");
  const token = Cookies.get("token");

  const request = await axios({
    url: "http://localhost:5000/projects",
    method: "get",
    headers: { authorization: token },
  });

  return request;
}

// Asynchronous function to send data to CDD Vault
export async function fetchSendData(type, data) {
  console.log("Fetching send data to CDD...");
  const token = Cookies.get("token");

  const request = await axios({
    url: "http://localhost:5000/submitdata",
    method: "post",
    headers: { authorization: token },
    data: { type, data },
  });

  return request;
}

// Asynchronous function to fetch the last occupied postion of the selected project
export async function fetchPosition(type, barcode, selectedProject) {
  console.log("Fetching position...");
  const token = Cookies.get("token");

  const request = await axios({
    url: "http://localhost:5000/getlocation",
    method: "post",
    headers: { authorization: token },
    data: { type: type, project: selectedProject, barcode: barcode },
  });

  return request;
}

// Asynchronous function to fetch the last occupied postion of the selected project
 export async function fetchLastPosition(selectedProject){
  if (selectedProject.value === 0) return;
  console.log("Fetching last position...");
  const token = Cookies.get("token");

  const request = await axios({
    url: "http://localhost:5000/getlastlocation",
    method: "post",
    headers: { authorization: token },
    data: selectedProject,
  });

  return request;
};
