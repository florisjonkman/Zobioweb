import requests
import time
import json
import logging

# Set logging
filename = 'api_cdd.py'
logger = logging.getLogger(filename)
logger.setLevel(level=logging.INFO)  # When debugging put to loggin.DEBUG
formatter = logging.Formatter("%(levelname)s | %(message)s")
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)


class ApiCDD():
    """ Class that makes connection to CDD API

    Arguments:
            base_url {string} -- url of vault: https://app.collaborativedrug.com/api/v1/vaults/<VAULD ID>/
            token {string} -- token of vault

    Conventions:
        - all 'request' methods return a dictionary with keys:
            [request]       {dic}      -- dictionary of all (incoming) request data
                > [type]        {str}      -- type of request ("GET", "POST")
                > [url]         {str}      -- Full CDD url, with which a connection is made
                > [json]        {dic}      -- Only with 'POST' request: Data send with request
            [reponse]       {dic}      -- dictionary of all (outgoing) response data
                > [status]      {int}      -- status code of CDD response, see status codes.
                > [json]        {dic}      -- Output of CDD repsonse, this contains all the data
                > [message]     {dic}      -- Discription of response, if error, than this contains the error

    Status codes (https://support.collaborativedrug.com/hc/en-us/articles/115005682123-Error-Codes-and-Messages):
        status  --  statusText              -- Description
        200     --  OK                      -- The cdd-request was successfully completed.
        400     --  Bad Request             -- Can be malformed JSON syntax or a database conflict.
        401     --  Unauthorized            -- Either you need to provide authentication credentials, or the credentials provided aren't valid.
        403     --  Forbidden               -- CDD understands your request, but refuses to fulfill it. An accompanying error message should explain why.
        403     --  Not Found               -- Either you're requesting an invalid URI or the resource in question doesn't exist
        500     --  Internal Server Error   -- The request was not completed due to an internal error on the server side.
        503     --  No Server Error         -- Usually occurs when there are too many requests coming into CDD.
    """

    def __init__(self, base_url, token):
        """ Initialized is called when class in created
        """

        self._base_url = base_url
        self._headers = {
            'X-CDD-token': token}

    def make_get_request(self, get_url):
        """ Makes 'GET' request to get_url

        Args:
            get_url (string): CDD url, with which the request must be
        """

        # Output
        dic = {'request': {'type': "GET", 'url': self._base_url+get_url, 'json': None},
               'response': {'status': None, 'json': None, 'message': None}}

        # Make request
        request = requests.request(
            "GET", dic['request']['url'], headers=self._headers)

        # Get response variables
        dic['response']['status'] = request.status_code
        dic['response']['json'] = request.json()

        if(dic['response']['status'] != 200):
            # Request failed, return
            dic['response']['message'] = request.text
            return dic

        # Request success
        dic['response']['message'] = 'The cdd-request was successfully completed'

        return dic

    def make_put_request(self, put_url, post_data):
        """ Makes 'POST' request to get_url, with post_data as body

        Args:
            put_url (str): CDD url, with which the reuqest must be made
            post_data (dic): body of reqeust
        """

        # Output
        dic = {'request': {'type': "PUT", 'url': self._base_url+put_url, 'json': post_data},
               'response': {'status': None, 'json': None, 'message': None}}

        # Make request
        request = requests.request(
            "PUT", dic['request']['url'], headers=self._headers, json=dic['request']['json'])

        # Get response variables
        dic['response']['status'] = request.status_code
        dic['response']['json'] = request.json()

        if(dic['response']['status'] != 200):
            # Request failed, return
            dic['response']['message'] = request.text
            return dic

        # Request success
        dic['response']['message'] = 'The cdd-request was successfully completed'

        return dic

    def request_projects(self):
        """ Function that request the projects from the CDD Vault

        Returns:
            {dic} -- discription above ^
        """

        # Get-URL for projects
        get_url = "projects/"

        dic = self.make_get_request(get_url)

        if(dic['response']['status'] != 200):
            # Request failed, return
            logger.error('%s | %s', filename, dic['response']['message'])
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
        get_url = "batches/?no_structures=true&"

        # Add kwargs to search
        # See: https://support.collaborativedrug.com/hc/en-us/articles/115005682943-Batch-es-GET-POST-PUT-
        if(kwargs):
            for key, value in kwargs.items():
                get_url += "{0}={1}&".format(key, value)

        # Force asynchronous request
        if(force_async):
            return self.request_batches_async(get_url)

        dic = self.make_get_request(get_url)
        if(dic['response']['status'] != 200):
            # Request failed, return
            logger.error('%s | %s', filename, dic['response']['message'])
            return dic

        if(dic['response']['json']['count'] > 1000):
            # Number of items in request over 1000, force asynchronous request, (see link for details)
            logger.info('%s | %s', filename,
                        'Alert: not all batches loaded, using async request!')
            return self.request_batches_async(get_url)

        if(dic['response']['json']['count'] > dic['response']['json']['page_size']):
            # Number of items in request is smaller, than found on page, rerun
            logger.info('%s | %s', filename,
                        'Alert: count larger than page_size, reran with get_batches(page_size=1000)')
            return self.request_batches(page_size=1000)

        # Request success
        dic['response']['message'] = 'The cdd-request was successfully completed'
        return dic

    def request_batches_async(self, url='batches/?'):
        """ Function (asynchronous) requests the batches from CDD Vault

        Arguments:
            url {string} -- URL without the base

        Returns:
            {dic} -- discription above ^
        """

        # Add asynchronous to get-URL
        get_url = url + "async=true"

        dic = self.make_get_request(get_url)
        if(dic['response']['status'] != 200):
            # Asynchronoys request failed, return
            logger.error('%s | %s', filename, dic['response']['message'])
            return dic

        # ID and status of asynchronous request
        export_id = dic['response']['json']['id']
        export_status = dic['response']['json']['status']

        while export_status != 'finished':
            # Check every 1 second if export is 'finished'
            get_url = 'export_progress/'+str(export_id)
            dic = self.make_get_request(get_url)

            if(dic['response']['status'] != 200):
                # Checking the asynchronous request failed, return
                logger.error('%s | %s', filename,
                             dic['response']['message'])
                return dic

            # Check status
            export_status = dic['response']['json']['status']
            if(export_status != 'finished'):
                logger.debug('%s | %s', filename, 'Check request: export_status = %s, sleep for 1 second and recheck' %
                             export_status)

            time.sleep(1)

        # When export is 'finished', download batches
        # Export request
        get_url = 'exports/'+str(export_id)
        dic = self.make_get_request(get_url)

        if(dic['response']['status'] != 200):
            # Export request failed, return
            logger.error('%s | %s', filename, dic['response']['message'])
            return dic

        dic['response']['message'] = 'The cdd-request was successfully completed'
        return dic

    def update_batch(self, id, data):
        # Put-URL
        put_url = "batches/" + str(id)

        dic = self.make_put_request(put_url, data)

        if(dic['response']['status'] != 200):
            # Request failed, return
            logger.error('%s | %s', filename, dic['response']['message'])
            return dic

        return dic
