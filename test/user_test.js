var Promise = require("bluebird");
var Base64 = require('js-base64').Base64;

var expect = require("chai").expect;
var rp = require("request-promise");
var _ = require("underscore");


// This test suite is to test the FitPay users API
// Author: Gerri Airato


// adding mock data responses since the server was not responding
var mock_response = require("../mock_response.json");
var use_mock = false;

var access_token;
var user = 'KehlLZbL';
var pass = 'zoGcKTSw';
var bearer_auth = {
    'bearer': true
};
var basic_auth = {
    'basic': true,
    'user': user,
    'pass': pass
};
var token_api = 'https://auth.qa.fitpay.ninja/oauth/token?grant_type=client_credentials';
var users_api = 'https://api.qa.fitpay.ninja/users';

var UserTestSuite = function() {

    var getOptions = function(url, method, headers) {

        return {
            uri: url,
            method: method,
            headers: headers,
            json: true,
            resolveWithFullResponse: true,
            simple: false,
            timeout: 20000
        };
    }

    var getHeaders = function(authorization) {

        var auth;
        
        if (authorization.basic) {
            auth = "Basic " + Base64.encode(authorization.user + ":" + authorization.pass);
        } else {
            if (use_mock) {
                auth = "Bearer " + mock_response.access_token;
            } else {
                auth = "Bearer " + access_token;
            }
        }

        return {
            'Authorization': auth,
            'Accept': 'application/json',
            'Accept-Charset': 'UTF-8',
            'Content-Type': 'application/json'
        };
    }

    var checkHealth = Promise.coroutine(function*() {
        var health_api = 'https://api.qa.fitpay.ninja/health';
        var headers = getHeaders(basic_auth);
    
        var options = getOptions(health_api, "GET", headers);
    
        var response = yield rp(options);
        if (response.statusCode !== 200) {
            use_mock = true;
            return 'Using mock data! System Unavailable: ' + response.statusCode + ': ' + response.statusMessage;
        } else {
            return response.body.message;
        }
    });

    describe("A fabulous test...", function() {

        before(Promise.coroutine(function*() {
            // This is needed to prevent getting an
            // self signed certificate in certificate chain error
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

            console.log('    . Check system health');
            var health = yield checkHealth();
            console.log('    .', health);
        }));

        it('Get the access token', Promise.coroutine(function*() {
            if (use_mock) {
                access_token = mock_response.access_token;
            } else {
                var headers = getHeaders(basic_auth);

                var options = getOptions(token_api, "GET", headers);

                var response = yield rp(options);

                var err_msg = response.statusCode + ': ' + response.statusMessage + '\n';
                expect(response.statusCode, err_msg).to.equal(200);

                access_token = response.body.access_token;
            }
            expect(access_token, 'Failed to get access_token!\n').to.not.be.undefined;
        }));

        it('Get the first page of users', Promise.coroutine(function*() {
            var links;
            var users_list;

            if (use_mock) {
                links = _.keys(mock_response.first_page._links);
                users_list = mock_response.first_page.results;
            } else {
                var headers = getHeaders(bearer_auth);

                var url = users_api + "?limit=5&offset=0";

                var options = getOptions(url, "GET", headers);

                var response = yield rp(options);

                var err_msg = response.statusCode + ': ' +
                    response.statusMessage + '\n';
                expect(response.statusCode, err_msg).to.equal(200);

                var links = _.keys(response.body._links);
                var users_list = response.body.results;
            }

            expect(links.length).to.equal(3);
            expect(_.contains(links, 'self')).to.be.true;
            expect(_.contains(links, 'last')).to.be.true;
            expect(_.contains(links, 'next')).to.be.true;
            expect(_.contains(links, 'prev')).to.be.false;
            expect(users_list.length).to.equal(5);
        }));

        it('Get the second page of users', Promise.coroutine(function*() {
            var links;
            var users_list;

            if (use_mock) {
                links = _.keys(mock_response.second_page._links);
                users_list = mock_response.second_page.results;
            } else {
                var headers = getHeaders(bearer_auth);

                var url = users_api + "?limit=5&offset=5";

                var options = getOptions(url, "GET", headers);

                var response = yield rp(options);

                var err_msg = response.statusCode + ': ' +
                    response.statusMessage + '\n';
                expect(response.statusCode, err_msg).to.equal(200);

                var links = _.keys(response.body._links);
                var users_list = response.body.results;
            }

            expect(links.length).to.equal(5);
            expect(_.contains(links, 'self')).to.be.true;
            expect(_.contains(links, 'first')).to.be.true;
            expect(_.contains(links, 'last')).to.be.true;
            expect(_.contains(links, 'next')).to.be.true;
            expect(_.contains(links, 'prev')).to.be.true;
            expect(users_list.length).to.equal(5);
        }));

        it('Get the last page of users', Promise.coroutine(function*() {
            var links;
            var last_page_results;
            var expected_items;

            if (use_mock) {
                last_page_results = mock_response.last_page.results;
                expected_items = 5;
            } else {

                var headers = getHeaders(bearer_auth);

                var url = users_api + "?limit=5&offset=0";

                var options = getOptions(url, "GET", headers);

                var response = yield rp(options);

                var err_msg = response.statusCode + ': ' +
                    response.statusMessage + '\n';
                expect(response.statusCode, err_msg).to.equal(200);

                links = _.keys(response.body._links);
                var last_url = response.body._links.last.href;
                var total = response.body.totalResults;
                var last_offset = last_url.slice(last_url.lastIndexOf("=") + 1);
                expected_items = total - last_offset;
                options = getOptions(last_url, "GET", headers);
                response = yield rp(options);
                last_page_results = response.body.results;
                links = _.keys(response.body._links);
            }
            expect(links.length).to.equal(3);
            expect(_.contains(links, 'self')).to.be.true;
            expect(_.contains(links, 'first')).to.be.true;
            expect(_.contains(links, 'last')).to.be.false;
            expect(_.contains(links, 'next')).to.be.false;
            expect(_.contains(links, 'prev')).to.be.true;
            expect(last_page_results.length).to.equal(expected_items);
        }));

        it('Attempt to get an offset greater than the total', Promise.coroutine(function*() {
            if (use_mock) {
            	return;
            }
            
        	var headers = getHeaders(bearer_auth);

            var url = users_api + "?limit=5&offset=0";

            var options = getOptions(url, "GET", headers);

            // start by getting a page so we can determine the total
            // number of items
            var response = yield rp(options);

            var err_msg = response.statusCode + ': ' +
                response.statusMessage + '\n';
            expect(response.statusCode, err_msg).to.equal(200);

            var links = _.keys(response.body._links);
            var last_url = response.body._links.last.href;
            var total = response.body.totalResults;
            var bad_url = users_api + "?limit=5&offset=" + (total + 5);
            options = getOptions(bad_url, "GET", headers);
            response = yield rp(options);
            expect(response.statusCode, response.statusCode + ': ' + response.statusMessage + '\n').to.equal(200);
            expect(response.body.results.length).to.equal(0);
        }));

        it('Attempt to use invalid credentials', Promise.coroutine(function*() {
        	
            if (use_mock) {
            	return;
            }
            
            // make the call with basic auth instead of a token
            var headers = getHeaders(basic_auth);

            var url = users_api + "?limit=5&offset=0";

            var options = getOptions(url, "GET", headers);

            var response = yield rp(options);

            var err_msg = response.statusCode + ': ' +
                response.statusMessage + '\n';
            expect(response.statusCode, err_msg).to.equal(403);
        }));
    });
}

UserTestSuite();
