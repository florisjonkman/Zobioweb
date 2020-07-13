import logging

# Set logging
filename = 'box_functions_9x9.py'
logger = logging.getLogger(filename)
logger.setLevel(level=logging.INFO)  # When debugging put to loggin.DEBUG
formatter = logging.Formatter("%(levelname)s | %(message)s")
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)


def location_string_to_array(location):
    """ Turns FJM1-1-B12 string into array [FJM,1,2,12]
        NOTE: Maximum row is currently ZZ, so (26*26+26) = 702 rows. Columns is infinite.
        Location convention: '<project name>'-'<box>'-'<pos>'
                             > pos= <LETTERS (2) ><NUMBER (INF)>
                             > LETTER gives row converted to integer (A=1,B=2,...,I=9,...,Z=26,AA=27,...,AZ=52,...,ZZ=702)
                             > NUMBER gives column (1,2,3,....)

    Args:
        location (string): String seperated by two '-'

    Returns:
        list {string,int,int,int} - [project_name, box_number, row_number, col_number]
    """
    project_name = ""
    box_int = None
    row_int = None
    col_int = None

    try:
        project_name, box_str, pos_str = location.split('-')
        row_int, col_int = map_pos_string_to_interger(pos_str)
        box_int = int(box_str)
    except Exception as e:
        logger.error('%s | \'%s\' cannot be splitted  | %s',
                     filename, location, str(e))

    return [project_name, box_int, row_int, col_int]


def get_last_location_from_batches(batches, request_project_name):
    """ Checks and returns what the last location
        NOTE: Maximum row is currently ZZ, so (26*26+26) = 702 rows. Columns is infinite.

    Arguments:
        batches {list} -- list with all batches in project
        request_project_name {string} -- name of project

    Returns:
        int, int ,int -- box [1,inf], row [1,2,3,...,701,702], col [1,inf]
    """

    # Last location starts at 0, 0, 0
    last_box = 0
    last_row = 0
    last_col = 0
    last_batch = {}

    for batch in batches:
        # Loop over all batches
        if((not batch['batch_fields']['Status']) or batch['batch_fields']['Status'] == 'Registered'):
            continue

        # Only batches if status is 'Registered'

        project_name, box_int, row_int, col_int = location_string_to_array(
            batch['batch_fields']['Location'])

        # if(name != request_project_name):
        #     # This can NEVER occur, to be sure output when it happens
        #     message = 'Strange: LocationPrefix is not the same as request_project_name, cdd_project_name = {0}, request_project_name = {1}!'.format(
        #         name, request_project_name)
        #     logger.warning('%s | %s', filename, message)

        # Calculate last location
        new_last_box, new_last_row, new_last_col = latest_location(
            [box_int, row_int, col_int], [last_box, last_row, last_col])
        if(not (new_last_box == last_box and new_last_row == last_row and new_last_col == last_col)):
            last_box, last_row, last_col = new_last_box, new_last_row, new_last_col
            last_batch = batch

    return last_box, last_row, last_col, last_batch


def map_pos_string_to_interger(pos):
    """ Maps string pos (e.g. A2, H12) to int array (e.g. [1,2], [8,12])
        NOTE: Maximum row is currently ZZ, so (26*26+26) = 702 rows. Columns is infinite.

    Arguments:
        pos {string} -- string of position A1,A2,...A12...,B1,B2,...B12,...,AA1,...,ZZ30

    Returns:
        tuple ({int}, {int}) -- tuple of row (1,2,3,...,702) and column (1,2,3,...,inf)
    """
    number_of_row_char = 1  # Number of row characters A2 is one, cause one A, AA30, is two

    row = pos[0]  # First letter
    # The ord() function returns an integer representing the Unicode character.
    row_index = ord(row)-64
    if(pos[1].isalpha()):
        # Check if second character is letter [A-Z], first character gives base 26 (A=1*26,B=2*26,...) + second 1-26
        row += pos[1]
        row_index = 26 * row_index + ord(pos[1])-64
        number_of_row_char += 1

    # Other characters give column index
    col = pos[number_of_row_char:]
    col_index = int(col)

    logger.debug('{0} | ({1},{2}) > ({3},{4})'.format(
        filename, row, col, row_index, col_index))
    return row_index, col_index


# def map_pos_inter_to_string(pos):
#     """ Maps integer pos (e.g. [1,2], [8,12]) to string array (e.g. A2, H12)
#         NOTE: Maximum row is currently I, so only 9 rows. Columns is infinite.

#     Arguments:
#         pos {array[row,col]} -- array of postion [1,1],[1,2],....

#     Returns:
#         string -- string of position A1,A2,...A9,B1,...
#     """
#     row, col = pos

#     letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
#     row_letter = letters[row-1]

#     result = row_letter + str(col)

#     return result


def latest_location(location, last_location):
    """ Compares two locations and returns which position is latest
        NOTE: Maximum row is currently ZZ, so (26*26+26) = 702 rows. Columns is infinite.

    Arguments:
        location {array [box,row,col]} -- new location
        last_location {array [box,row,col]} -- latest location

    Returns:
        int, int ,int -- box [1,inf], row [1,...,702], col [1,inf]
    """

    box, row, col = location
    last_box, last_row, last_col = last_location

    logger.debug('{0} | get_latest_location({1},{2})'.format(
        filename, location, last_location))

    if(box < last_box):
        logger.debug('{0} | box < last_box'.format(
            filename))
        # box is below last_box, do not change anything
        logger.debug('{0} | >1 return {1}'.format(
            filename, last_location))
        return last_box, last_row, last_col

    elif(box == last_box):
        logger.debug('{0} | boxes equal'.format(
            filename))
        # box number the same
        if(row < last_row):
            # row is below last_row, do not change anything
            logger.debug('{0} | >2 return {1}'.format(
                filename, last_location))
            return last_box, last_row, last_col
        if(row == last_row):
            logger.debug('{0} | rows equal'.format(
                filename))
            if(col < last_col):
                # col is below last_col, do not change anything
                logger.debug('{0} | >3 return {1}'.format(
                    filename, last_location))
                return last_box, last_row, last_col

    logger.debug('{0} | >4 return {1}'.format(
        filename, location))
    return box, row, col
