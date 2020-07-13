/**
 * Check if barcode is unique in dataset
 *
 * Arguments:
 *    @arg {list} data -- data array of all scanned items
 *    @arg {string} barcode -- barcode string of (newly) scanned item
 *
 * Returns:
 *    @returns {bool} -- true if unique, false if not
 */
export function isBarcodeUnique(data, barcode) {
  let isUnique = true;
  data.forEach((item, index) => {
    if (barcode === item.barcode) {
      isUnique = false;
      return isUnique;
    }
  });
  return isUnique;
}

/**
 * Formats dateTime object to string
 *
 * Arguments:
 *    @arg {dateTime-object} dateTime
 *
 * Returns:
 *    @returns {string} -- HH:MM, DD MMM YYYY
 */
export function formatDate(dateTime) {
  const monthNames = ["Jan", "Feb", "Mrt", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

  //  Setting for HH:MM, DD MMM YYYY
  let month = monthNames[dateTime.getMonth()];
  let day = "" + dateTime.getDate();
  let year = "" + dateTime.getFullYear();
  let hours = "" + dateTime.getHours();
  let min = "" + dateTime.getMinutes();

  // month = month.length > 1 ? month : "0" + month;
  day = day.length > 1 ? day : "0" + day;
  hours = hours.length > 1 ? hours : "0" + hours;
  min = min.length > 1 ? min : "0" + min;

  return "" + hours + ":" + min + ", " + day + " " + month + " " + year;
}

/**
 * Returns next box and position
 *
 * Arguments:
 *    @arg {integer} box -- box [1,inf]
 *    @arg {integer} pos -- position [11,12...18,19,21,22...,28,29,31,32......98,99]
 */
export function calculateNextLocation(box, row, col, max_rows, max_cols) {
  let nextBox = 1;
  let nextRow = 1;
  let nextCol = 1;

  if (!box && !row && !col) {
    // No correct values given, start with beginning
    return [nextBox, nextRow, nextCol];
  }

  if (row >= max_rows) {
    // Row is in latest row of the box, row up -> next box
    if (col >= max_cols) {
      // At the end of an row, so the last column
      nextBox = box + 1;
      nextRow = 1;
      nextCol = 1;
    } else {
      // Not at the end of an row, so column 1...,max_cols-1
      nextBox = box;
      nextRow = row;
      nextCol = col + 1;
    }
  } else {
    // Row is NOT latest row of the box, row up -> next row
    if (col >= max_cols) {
      // At the end of an row, so the last column
      nextBox = box;
      nextRow = row + 1;
      nextCol = 1;
    } else {
      // Not at the end of an row, so column 1...,max_cols-1
      nextBox = box;
      nextRow = row;
      nextCol = col + 1;
    }
  }

  return [nextBox, nextRow, nextCol];
}

/**
 * Maps string pos (e.g. A2, H12) to int array (e.g. [1,2], [8,12])
 * NOTE: Maximum row is currently ZZ, so (26*26+26) = 702 rows. Columns is infinite.
 *
 * Arguments:
 *    @arg {string} string  -- string of position A1,A2,...A12...,B1,B2,...B12,...,AA1,...,ZZ30
 *
 * Returns:
 *    @returns {list, [rowIndex,colIndex]} -- tuple of row (1,2,3,...,702) and column (1,2,3,...,inf)
 */

export function posStringToInteger(string) {
  let numberOfRowChar = 1; // Number of row characters A2 is one, cause one A, AA30, is two

  // The charCodeAt(0) function returns an integer representing the Unicode character of the string[0].
  let rowIndex = string.charCodeAt(0) - 64;
  if (isAlpha(string.substring(1, 2))) {
    // Check if second character is letter [A-Z], first character gives base 26 (A=1*26,B=2*26,...), second 1-26
    rowIndex = 26 * rowIndex + (string.charCodeAt(1) - 64);
    numberOfRowChar++;
  }

  // Other characters give column index
  const colIndex = parseInt(string.substring(numberOfRowChar));

  return [rowIndex, colIndex];
}

/**
 * Checks if character is letter [A-Z]
 *
 * Arguments:
 *    @var {string} ch -- character
 *
 * Returns:
 *    @returns {bool}
 *
 */
function isAlpha(ch) {
  return /^[A-Z]$/i.test(ch);
}

/**
 * Maps int array of pos (e.g. [1,2], [8,12]) to string (e.g. A2, H12)
 * NOTE: Maximum row is currently ZZ, so (26*26+26) = 702 rows. Columns is infinite.
 *
 * Arguments:
 *    @arg {int} row  -- row number
 *    @arg {int} col  -- column number
 *
 * Returns:
 *    @returns {string} -- string of position
 */
export function posIntegerToString(row, col) {
  let rowLetters;
  if (row <= 26) {
    // If below 26 characters give letter of row (65=A,66=B,...,Z=90)
    rowLetters = String.fromCharCode(64 + row);
  } else {
    // If above 26 charcters two letters are given AA,...,ZZ
    const nBase26 = Math.floor((row - 1) / 26);
    const firstLetter = String.fromCharCode(64 + nBase26);
    const secondLetter = String.fromCharCode(64 + row - nBase26 * 26);
    rowLetters = firstLetter + secondLetter;
  }

  const result = rowLetters + col.toString();

  return result;
}
/**
 *
 * @param {int} box -- Box number
 * @param {string} projectName -- Project name
 */
export function generateContainerBarcode(box, projectName) {
  let containerBarcode = "";
  let base = "0000";
  let n = "1";

  if (!box) {
    containerBarcode = projectName + "-" + (base + n).slice(-base.length);
  } else {
    containerBarcode = projectName + "-" + (base + box).slice(-base.length);
  }

  return containerBarcode;
}
