import React from "react";
import Cookies from "js-cookie";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Box from "@material-ui/core/Box";
import Avatar from "@material-ui/core/Avatar";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: "flex-start",
  },
  buttonSignOut: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 10,
  },
}));

function RightDrawer({ open }) {
  const classes = useStyles();
  const fullname = Cookies.get("fullname");

  const handleSignout = () => {
    Cookies.remove("username");
    Cookies.remove("fullname");
    Cookies.remove("authentication");
    Cookies.remove("remember");
    Cookies.remove("token");
  };

  return (
    <React.Fragment>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="right"
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <Divider />
        <Box flexGrow={1}>
          <List>
            <ListItem>
              <ListItemText secondary={"Account"} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Avatar aria-label="recipe" component="a">
                  {fullname ? fullname.charAt(0).toUpperCase() : ""}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={fullname} />
            </ListItem>
          </List>
        </Box>
        <List>
          <div className={classes.buttonSignOut}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSignout}
              href="/"
            >
              Sign out
            </Button>
          </div>
        </List>
      </Drawer>
    </React.Fragment>
  );
}

export default RightDrawer;
