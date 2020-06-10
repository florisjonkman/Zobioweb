import React, { useState, useEffect, useContext } from "react";
import clsx from "clsx";
import Cookies from "js-cookie";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";

import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";

import RightDrawer from "./RightDrawer";
import HomeScreen from "./Home/HomeScreen";
import Add from "./Scan/Add";
import Delete from "./Scan/Delete";
import CheckIn from "./Scan/CheckIn";
import CheckOut from "./Scan/CheckOut";
import ZobioLogoFlat from "./img/ZobioLogo_Flat.svg";

const drawerWidth = 240;

// Styles
const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  appBar: {
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: drawerWidth,
  },
  backButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  hide: {
    display: "none",
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: "flex-start",
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginRight: -drawerWidth,
  },
  contentShift: {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  },
}));

export default function Dashboard(props) {
  // Styles
  const classes = useStyles();

  // Page states
  const [openDrawer, setOpenDrawer] = useState(false); // bool, is the drawer open
  const [openDialog, setOpenDialog] = useState(false); // bool, is the dialog open
  const [openPopup, setOpenPopup] = useState(false); // bool, if this is true, and back is cliked the Dialog is open
  const [lastPage, setLastPage] = useState(""); // string, title of last page
  const [activePage, setActivePage] = useState("Home"); // string, active page

  // Delete Cookies before unloading page
  useEffect(() => {
    window.addEventListener("beforeunload", (event) => {
      const remember = Cookies.get("remember") === "true";

      event.preventDefault();
      if (!remember) {
        // Only delete cookies, when remember was false
        console.log("Remember was false, remove all cookies");
        Cookies.remove("username");
        Cookies.remove("token");
        Cookies.remove("authentication");
        Cookies.remove("remember");
      }
    });
  });

  // Handle function when 'drawer' button is clicked
  const handleDrawerOpen = () => {
    if (openDrawer) {
      setOpenDrawer(false);
    } else {
      setOpenDrawer(true);
    }
  };

  // Handle function when 'back (<)' button in the Drawer is clicked
  const handleDrawerBack = () => {
    if (openPopup) {
      setOpenDialog(true);
    } else {
      handleBack();
    }
  };

  // Function to open and close the dialog window
  const handleDialog = () => {
    if (openDialog) {
      setOpenDialog(false);
    } else {
      setOpenDialog(true);
    }
  };

  // Function to handle the 'back (<)' button
  const handleBack = () => {
    setOpenDialog(false);

    if (["Add", "Delete", "Check-in", "Check-out"].includes(lastPage)) {
      setOpenPopup(true);
    } else {
      setOpenPopup(false);
    }

    setLastPage(activePage);
    setActivePage(lastPage);
  };

  // Function to open and close the dialog window
  const handleChangePage = (page) => {
    if (["Add", "Delete", "Check-in", "Check-out"].includes(page)) {
      setOpenPopup(true);
    } else {
      setOpenPopup(false);
    }
    setLastPage(activePage);
    setActivePage(page);
  };

  const getPageContent = (page) => {
    switch (page) {
      case "Add":
        return <Add handleChangePage={handleChangePage} />;
      case "Delete":
        return <Delete handleChangePage={handleChangePage} />;
      case "Check-in":
        return <CheckIn handleChangePage={handleChangePage} />;
      case "Check-out":
        return <CheckOut handleChangePage={handleChangePage} />;
      default:
        return <HomeScreen handleChangePage={handleChangePage} />;
    }
  };

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar
        position="fixed"
        className={clsx(classes.appBar, {
          [classes.appBarShift]: openDrawer,
        })}
      >
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.backButton}
            color="inherit"
            aria-label="back drawer"
            onClick={handleDrawerBack}
          >
            <ChevronLeftIcon />
          </IconButton>
          <img src={ZobioLogoFlat} width={150} />
          <Typography variant="h6" noWrap className={classes.title}>
            {" "}
          </Typography>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="end"
            onClick={handleDrawerOpen}
            disableRipple={false}
          >
            {!openDrawer ? <MenuIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <main
        className={clsx(classes.content, {
          [classes.contentShift]: openDrawer,
        })}
      >
        <div className={classes.drawerHeader} />
        {getPageContent(activePage)}
      </main>
      <RightDrawer open={openDrawer} />
      <Dialog
        open={openDialog}
        onClose={handleDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Are you sure you want to go back?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            All scanned data will be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBack} color="primary">
            Yes
          </Button>
          <Button onClick={handleDialog} color="primary" autoFocus>
            No
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
