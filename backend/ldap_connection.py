from ldap3 import Server, Connection, ALL, SUBTREE
import json
import datetime
import logging


# Set logging
filename = 'ldap_connection.py'
logger = logging.getLogger(filename)
logger.setLevel(level=logging.INFO)  # When debugging put to loggin.DEBUG
formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s",
                              "%Y-%m-%d %H:%M:%S")
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)

# Load password
ssl_dir = "../ssl/"  # /var/www/backend/ssl/requirements.txt
with open(ssl_dir + 'requirements.txt') as json_file:
    requirements = json.load(json_file)
    SERVICE_PWD = requirements['service_account_pwd']

# Load private_key # /var/www/backend/ssl/requirements.txt
with open(ssl_dir + 'private_key.pem', 'rb') as key_file:
    PRIVATE_KEY = key_file.read()


def ldap_connection(username, password):
    # LDAP url and host
    host = 'ldap://192.168.60.1'  # URL of LDAP server
    port = 389  # Port to acces server

    # Output
    user_data = {'cn': None, 'mail': None, 'username': None}
    output = {'status': False, 'message': None,
              'userData': None}

    # Setup connection for Service Account (to extract user data)
    server = Server(host, port=port, get_info=ALL)  # Setup server
    conn = Connection(server, 'CN=Service Account ZoBioWeb,OU=Service Users,OU=Users,OU=Zobio,DC=zobio,DC=local',
                      SERVICE_PWD)

    try:
        # Make connection
        result = conn.bind()
    except Exception as e:
        # Could not make connection with LDAP server
        output['message'] = 'LDAP: Service account: Connection with LDAP server failed, error: {0}'.format(
            str(e))
        logger.critical('%s  %s  %s', filename, username, output['message'])
        return output

    if not result:
        # Failed to connect to the server, username and/or password are INcorrect
        output['message'] = 'LDAP: Service account: could NOT make LDAP connection'
        logger.critical('%s  %s  %s', filename, username, output['message'])
        # print(output['message'])
        return output

    # Lookup CN of user, using their (mail)
    result = conn.search(search_base='OU=Users,OU=Users,OU=Zobio,DC=zobio,DC=local',
                         search_filter='(mail=%s)' % username, attributes=['CN', 'sAMAccountName', 'mail'])
    user_ldap_data = conn.entries
    if(len(user_ldap_data) == 0):
        # More than one user found, this cannout occur
        output['message'] = 'LDAP: no account found with e-mail \'{0}\''.format(
            username)
        logger.warning('%s  %s  %s', filename, username, output['message'])
        # print(output['message'])
        return output
    elif(len(user_ldap_data) > 1):
        # More than one user found, this cannout occur
        output['message'] = 'LDAP: User account: More users found with this mail-address'
        logger.warning('%s  %s  %s', filename, username, output['message'])
        # print(output['message'])
        return output

    # Extract CN of user
    ldap_dic = user_ldap_data[0].entry_attributes_as_dict
    user_data['cn'] = ldap_dic['cn'][0]
    user_data['mail'] = ldap_dic['mail'][0]
    user_data['username'] = ldap_dic['sAMAccountName'][0]

    # Setup connection for user
    conn = Connection(server, 'CN=%s,OU=Users,OU=Users,OU=Zobio,DC=zobio,DC=local' % user_data['cn'],
                      password)  # Setup connection

    try:
        # Make connection
        result = conn.bind()
    except Exception as e:
        # Could not make connection with LDAP server
        output['message'] = 'LDAP: User account: Connection with LDAP server failed, error: {0}'.format(
            e)
        logger.critical('%s  %s  %s', filename, username, output['message'])
        # print(output['message'])
        return output

    if not result:
        # Failed to connect to the server, username and/or password are INcorrect
        output['message'] = 'LDAP: User account: could NOT make LDAP connection'
        logger.critical('%s  %s  %s', filename, username, output['message'])
        # print(output['message'])
        return output

    # Succesfully made connection, return
    output['status'] = True
    output['message'] = 'LDAP: user \'{0}\' successfully connected with LDAP'.format(
        username)
    logger.info('%s  %s  %s', filename, username, output['message'])
    # print(output['message'])
    output['userData'] = user_data

    return output
