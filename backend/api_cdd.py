import requests
import time
import json


class ApiCDD():
    """ Class that makes connection to CDD API

    Arguments:
            base_url {string} -- url of vault: https://app.collaborativedrug.com/api/v1/vaults/<VAULD ID>/
            token {string} -- token of vault

    Conventions:
        - all 'request' methods return a dictionary with keys:
            [status]        {int}      -- status code, see below for codes
            [statusText]    {string}   -- text beloging to status
            [message]       {string}   -- message
            [request]       {dic}      -- relavant data of request
                > [code]    {string}   -- url request status code, 200 is success
                > [url]     {string}   -- url send to CDD to make request
                > [json]    {dic}      -- json of request response
                > [text]    {string}   -- text of request response
                * [postdata]{dic}      -- dictionary of the posted data (OPTIONAL)

        - all 'get' methods return a dictionary with keys:
            [status]        {int}      -- status code, see below for codes
            [statusText]    {string}   -- text beloging to status
            [message]       {string}   -- message
            [cddResponse]   {dic}      -- response data
            [request]       {dic}      -- request data

    Status codes:
        status  --  statusText              -- Description
        200     --  OK                      -- The request was successfully completed.
        400     --  Bad request             -- The request was invalid.
        401     --  Unauthorized            -- The request did not include an authentication token or the authentication token was expired.
        500     --  Internal Server Error   -- The request was not completed due to an internal error on the server side.
    """

    def __init__(self, base_url, token):
        """ Initialized is called when class in created
        """

        self._base_url = base_url
        self._headers = {
            'X-CDD-token': token}

    def make_get_request(self, get_url):
        dic = {'status': None, 'statusText': '', 'message': None, 'request': {
            'code': None, 'url': None, 'json': None, 'text': None}}

        dic['request']['url'] = self._base_url+get_url

        # Make request
        request = requests.request(
            "GET", dic['request']['url'], headers=self._headers)

        # Get request variables
        dic['request']['code'] = request.status_code
        dic['request']['json'] = request.json()

        if(dic['request']['code'] != 200):
            # Request failed, return
            dic['status'] = 400
            dic['request']['text'] = request.text
            dic['statusText'] = 'Bad request'
            dic['message'] = 'Error: invalid request'
            return dic

        # Request success
        dic['status'] = 200
        dic['statusText'] = 'OK'
        dic['message'] = 'The request was successfully completed'

        return dic

    def make_put_request(self, put_url, post_data):
        dic = {'status': None, 'statusText': '', 'message': None, 'request': {
            'code': None, 'url': None, 'json': None, 'text': None, 'postdata': post_data}}

        dic['request']['url'] = self._base_url+put_url

        # Make request
        request = requests.request(
            "PUT", dic['request']['url'], headers=self._headers, json=post_data)

        # Get request variables
        dic['request']['code'] = request.status_code
        dic['request']['postdata'] = post_data
        dic['request']['json'] = request.json()

        if(dic['request']['code'] != 200):
            # Request failed, return
            dic['status'] = 400
            dic['request']['text'] = request.text
            dic['statusText'] = 'Bad request'
            dic['message'] = 'Error: invalid request'
            return dic

        # Request success
        dic['status'] = 200
        dic['statusText'] = 'OK'
        dic['message'] = 'The request was successfully completed'

        return dic

    def request_projects(self):
        """ Function that request the projects from the CDD Vault

        Returns:
            {dic} -- discription above ^
        """

        # Get-URL for projects
        get_url = "projects/"

        dic = self.make_get_request(get_url)

        if(dic['status'] != 200):
            # Request failed, return
            print(dic['message'])
            return dic

        return dic

    def request_batches(self, force_async=False, **kwargs):
        """ Function that (synchronous) request the batches from CDD Vault

        Keyword Arguments:
            force_async {bool} -- [boolean to make asynchronous request] (default: {False})

        Returns:
            dic -- discription above ^
        """

        # Get-URL for batches
        get_url = "batches/?"

        # Add kwargs to search
        # See: https://support.collaborativedrug.com/hc/en-us/articles/115005682943-Batch-es-GET-POST-PUT-
        if(kwargs):
            for key, value in kwargs.items():
                get_url += "{0}={1}&".format(key, value)

        # Force asynchronous request
        if(force_async):
            return self.request_batches_async(get_url)

        dic = self.make_get_request(get_url)
        if(dic['status'] != 200):
            # Request failed, return
            print(dic['message'])
            return dic

        if(dic['request']['json']['count'] > 1000):
            # Number of items in request over 1000, force asynchronous request, (see link for details)
            print(
                'Alert: not all batches loaded, using async request!')
            return self.request_batches_async(get_url)

        if(dic['request']['json']['count'] > dic['request']['json']['page_size']):
            # Number of items in request is smaller, than found on page, rerun
            print(
                'Alert: count larger than page_size, reran with get_batches(page_size=1000)')
            return self.request_batches(page_size=1000)

        # Request success
        dic['status'] = 200
        dic['statusText'] = 'OK'
        dic['message'] = 'The request was successfully completed'
        return dic

    def request_batches_async(self, url):
        """ Function (asynchronous) requests the batches from CDD Vault

        Arguments:
            url {string} -- URL without the base

        Returns:
            {dic} -- discription above ^
        """

        # Add asynchronous to get-URL
        get_url = url + "async=true"

        dic = self.make_get_request(get_url)
        if(dic['status'] != 200):
            # Asynchronoys request failed, return
            message = 'Error: async export request not valid'
            dic['message'] = message
            print(message)
            return dic

        # ID and status of asynchronous request
        export_id = dic['request']['json']['id']
        export_status = dic['request']['json']['status']

        while export_status != 'finished':
            # Check every 1 second if export is 'finished'
            get_url = 'export_progress/'+str(export_id)
            dic = self.make_get_request(get_url)

            if(dic['status'] != 200):
                # Checking the asynchronous request failed, return
                message = 'Error: async check request not valid'
                dic['message'] = message
                print(message)
                return dic

            # Check status
            export_status = dic['request']['json']['status']
            if(export_status != 'finished'):
                print('Check request: export_status = %s, sleep for 1 second and recheck' %
                      export_status)

            time.sleep(1)

        # When export is 'finished', download batches
        # Export request
        get_url = 'exports/'+str(export_id)
        dic = self.make_get_request(get_url)

        if(dic['status'] != 200):
            # Export request failed, return
            message = 'Error: async data download not succeeded'
            dic['message'] = message
            print(message)
            return dic

        # Request success
        dic['status'] = 200
        dic['statusText'] = 'OK'
        dic['message'] = 'The request was successfully completed'
        return dic

    def update_batch(self, id, data):
        # Put-URL
        put_url = "batches/" + str(id)

        dic = self.make_put_request(put_url, data)

        if(dic['status'] != 200):
            # Request failed, return
            print(dic['message'])
            return dic

        return dic

    def get_projects(self):
        """ Function that return all projects from CDD Vault

        Returns:
            {dic} -- discription above ^
        """

        # Request projects
        request = self.request_projects()

        # Create output
        dic = {'status': None, 'statusText': '', 'message': None,
               'cddResponse': {}, 'request': None}

        dic['statusText'] = request['statusText']
        dic['status'] = request['status']
        dic['message'] = request['message']

        if(request['status'] != 200):
            # Request failed
            dic['request'] = request
            print(dic['message'])
            return dic
        else:
            # Request success
            dic['cddResponse'] = {'projects': request['request']['json']}
            dic['message'] = 'The request was successfully completed, the project are succesfully selected'
            return dic

    def get_batches(self, id=None):
        """ Function that return all batches from CDD Vault

        Keyword Arguments:
            id {int} -- identifier of batch (default: {None})

        Returns:
            {dic} -- discription above ^
        """

        # Request batches
        if(id):
            request = self.request_batches(
                page_size=999, no_structures='true', projects=id)
        else:
            request = self.request_batches(
                page_size=999, no_structures='true')

        # Create output
        dic = {'status': None, 'statusText': '', 'message': None,
               'cddResponse': {}, 'request': None}

        dic['statusText'] = request['statusText']
        dic['status'] = request['status']
        dic['message'] = request['message']

        if(request['status'] != 200):
            # Request failed
            dic['request'] = request
            print(dic['message'])
            return dic

        batches = []  # Batches: OUTPUT
        objects = request['request']['json']['objects']  # Batches: FROM CDD

        # Only show relevant batch data with batch_data()
        for batch in objects:
            batches.append(self.batch_data(batch))

        dic['cddResponse'] = {'batches': batches}
        dic['message'] = 'The request was successfully completed, the batches are succesfully selected'

        return dic

    def get_vials(self, id=None):
        """ Function that returns all vials (from batch ID)

        Keyword Arguments:
            id {int} -- identifier of batch (default: {None})

        Returns:
            {dic} -- discription above ^
        """
        get_response = self.get_batches(id=id)

        # Create output
        dic = {'status': None, 'statusText': '', 'message': None,
               'cddResponse': {}, 'request': None}

        dic['statusText'] = get_response['statusText']
        dic['status'] = get_response['status']
        dic['message'] = get_response['message']

        if(get_response['status'] != 200):
            # Request failed
            dic['request'] = get_response['request']
            print(dic['message'])
            return dic

        batches = get_response['cddResponse']['batches']
        vials = []

        for batch in batches:
            if(len(batch['projects']) > 1):
                # batch is assigned to different projects, this cannot occcur by convention
                message = 'Error: batch found in multiple projects, this cannot occur'
                dic['message'] = message
                dic['status'] = 500
                dic['statusText'] = 'Internal Server Error'
                dic['request'] = get_response['request']
                return dic

            # get relavent batch fields
            vials.append({'id': batch['id'], 'Vial barcode': batch['Vial barcode'],
                          'Status': batch['Status'], 'Location': batch['Location'], 'project': batch['projects'][0]})

        dic['cddResponse'] = {'vials': vials}
        dic['message'] = 'The request was successfully completed, the batches are succesfully selected'
        return dic

    @ staticmethod
    def batch_data(batch):
        """ Extracts all relevant data from batch

        Arguments:
            batch {dic} -- batch as given by CDD API

        Returns:
            {dic}
        """

        # Create output
        dic = {'id': None, 'projects': None, 'Location': None, 'Vial barcode': None,
               'Status': None, 'Registration date': None, 'Initial amount': None, 'Current amount': None}

        # Get relavant variables
        dic['id'] = batch['id']
        dic['projects'] = batch['projects']

        if 'Location' in batch['batch_fields']:
            dic['Location'] = batch['batch_fields']['Location']

        if 'Vial barcode' in batch['batch_fields']:
            dic['Vial barcode'] = batch['batch_fields']['Vial barcode']

        if 'Status' in batch['batch_fields']:
            dic['Status'] = batch['batch_fields']['Status']

        if 'Registration date' in batch['batch_fields']:
            dic['Registration date'] = batch['batch_fields']['Registration date']

        if 'Initial amount' in batch['batch_fields']:
            dic['Initial amount'] = batch['batch_fields']['Initial amount']

        if 'Current amount' in batch['batch_fields']:
            dic['Current amount'] = batch['batch_fields']['Current amount']

        return dic


# with open('./ssl/requirements.txt') as json_file:
#     data = json.load(json_file)
#     BASE_URL = "https://app.collaborativedrug.com/api/v1/vaults/%s/" % (
#         data['cdd_vault_id'])
#     TOKEN = data['cdd_token']

# ApiCdd = ApiCDD(BASE_URL, TOKEN)

# print('\nrequest_projects():')
# print(ApiCdd.request_projects())

# print('\nrequest_batches()')
# print(ApiCdd.request_batches())

# print('\nrequest_batches(force_async=True)')
# print(ApiCdd.request_batches(force_async=True))

# print('\nrequest_batches(no_structures=\'true\', projects=12478)')
# print(ApiCdd.request_batches(no_structures='true', projects=12478))

# print('\nrequest_batches_async(batches/?)')
# print(ApiCdd.request_batches_async('batches/?'))

# print('\nget_projects()')
# print(ApiCdd.get_projects())

# print('\nget_batches()')
# print(ApiCdd.get_batches())

# print('\nget_vials()')
# print(ApiCdd.get_vials())

# print('\nupdate_batch()')
# data = {
#     "batch_fields": {
#         "Location": "Location",
#         "Status": "Registered"
#     }
# }
# print(ApiCdd.update_batch(77822811, data))
