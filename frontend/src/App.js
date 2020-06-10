import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import useCookie from "@devhammed/use-cookie";

import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";

import AuthApi from "./AuthApi";
import Login from "./Login";
import Dashboard from "./Dashboard";

// Or Create your Own theme:
const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#173D5C", // Zobio main color, dark green blueish
      light: "#476789",
      dark: "#001732",
    },
    secondary: {
      main: "#b71c1c",
      light: "#f05545",
      dark: "#7f0000",
    },
    error: {
      main: "#d32f2f",
      light: "#ff6659",
      dark: "#9a0007",
    },
    warning: {
      main: "#ffab00",
      light: "#ffdd4b",
      dark: "#c67c00",
    },
    success: {
      main: "#388e3c",
      light: "#6abf69",
      dark: "#00600f",
    },
  },
});

function App() {
  const [auth, setAuth, deleteAuth] = useCookie("authentication", false);

  return (
    <MuiThemeProvider theme={theme}>
      <AuthApi.Provider value={{ auth, setAuth }}>
        <Router>
          <Routes />
        </Router>
      </AuthApi.Provider>
    </MuiThemeProvider>
  );
}

function ProtectedRoute({ auth, component: Component, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) =>
        auth ? (
          <Component {...props} />
        ) : (
          <Redirect to={{ pathname: "/login" }} />
        )
      }
    />
  );
}

function ProtectedLogin({ auth, component: Component, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) =>
        !auth ? (
          <Component {...props} />
        ) : (
          <Redirect to={{ pathname: "/dashboard" }} />
        )
      }
    />
  );
}

const Routes = () => {
  const Auth = React.useContext(AuthApi);
  return (
    <Switch>
      <ProtectedRoute
        path="/dashboard"
        exact
        auth={Auth.auth}
        component={Dashboard}
      />
      <ProtectedLogin path="/login" exact auth={Auth.auth} component={Login} />
      <ProtectedLogin path="/" auth={Auth.auth} component={Login} />
    </Switch>
  );
};

export default App;
