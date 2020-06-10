import React, { useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import forge from "node-forge"

import { makeStyles, useTheme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress";
import LinearProgress from "@material-ui/core/LinearProgress";

import Container from "@material-ui/core/Container";

import AuthApi from "./AuthApi";
import ZobioLogo from "./img/ZobioLogo.svg";

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

function Login(props) {
  const classes = useStyles();
  const Auth = React.useContext(AuthApi);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onChange = (event) => {
    const { value, name } = event.target;
    if (name === "username") {
      setUsername(value);
    }
    if (name === "password") {
      setPassword(value);
    }
    if (name === "remember") {
      setRemember(!remember);
    }
  };

  const fetchCheckLDAP = async () => {
    console.log("Fetching checking ldap account...");
    setIsLoading(true);

    const publicKey = forge.pki.publicKeyFromPem(process.env.REACT_APP_PUBLIC_KEY);
    const encryptedPassword = publicKey.encrypt(password, "RSA-OAEP", {
            md: forge.md.sha256.create(),
            mgf1: forge.mgf1.create()
        });
    const base64 = forge.util.encode64(encryptedPassword);

    const request = await axios({
      url: "http://localhost:5000/login",
      method: "post",
      auth: {
        username: username,
        password: base64,
      },
    });

    setIsLoading(false);
    return request;
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const { history } = props;

    fetchCheckLDAP()
      .then((response) => {
        console.log(response);
        if (response.status == 200 && response.statusText == "OK") {
          console.log(response.data["message"]);
          Auth.setAuth(true);
          Cookies.set("username", response.data["output"]['userData']['username'], { expires: 1 });
          Cookies.set("fullname", response.data["output"]['userData']['cn'], { expires: 1 });
          Cookies.set("authentication", true, { expires: 1 });
          Cookies.set("token", response.data["output"]["token"], {
            expires: 1,
          });
          Cookies.set("remember", remember, { expires: 1 });
          history.push("/dashboard");
        } else {
          console.error("ERROR: Request succeeded, but status not 200");
          console.error(response);
        }
      })
      .catch((error) => {
        setIncorrect(true);
        if (error.response) {
          console.error(
            `ERROR fetchCheckLDAP(), status: ${error.response.status}, statusText: ${error.response.statusText}, message: '${error.response.data["message"]}'`
          );
        } else {
          console.error(error);
        }
        setIsLoading(false);
      });
  };

  return (
    <React.Fragment>
      {isLoading && <LinearProgress />}
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
          <img src={ZobioLogo} width={200} />
          <form className={classes.form}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              error={incorrect}
              value={username}
              id="username"
              name="username"
              label="Username"
              autoComplete="username"
              autoFocus
              onChange={onChange}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              error={incorrect}
              value={password}
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              onChange={onChange}
            />
            <FormControlLabel
              control={
                <Checkbox
                  id="remember"
                  name="remember"
                  value="remember"
                  color="primary"
                  checked={remember}
                  onChange={onChange}
                />
              }
              label="Remember me"
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
              onClick={onSubmit}
            >
              Sign In
            </Button>
          </form>
        </div>
      </Container>
    </React.Fragment>
  );
}

export default Login;
