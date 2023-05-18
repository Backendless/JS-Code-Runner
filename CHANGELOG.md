## Change Log

### v7.0.0 (2023/05/18)
- apply LogLevels in the JSCodeRunner from the context

### v6.7.4 (2023/04/18)
- fix resolving local config in the debug mode

### v6.7.3 (2023/04/18)
- fix initializing config for the StatusService

### v6.7.2 (2023/04/17)
- fix reconnection to the redis

### v6.7.1 (2023/03/27)
- fix Consul config

### v6.7.0 (2023/03/27)
- integrate with the Status Service 
- upgrade "backendless": "^6.7.0"

### v6.6.4 (2023/02/27)
- upgrade "backendless-consul-config-provider": "^2.0.2"

### v6.6.3 (2023/02/21)
- cleanup logs

### v6.6.2 (2023/02/16)
- cleanup env variables for workers

### v6.6.1 (2023/02/13)
- upgrade "backendless": "^6.6.5"
- BKNDLSS-31341 Error during logs flushing Session timeout

### v6.6.0 (2023/01/02)
- BKNDLSS-31251 Dispose idle cached workers

### v6.5.8 (2022/10/17)
- upgrade "backendless": "^6.5.0"

### v6.5.7 (2022/10/07)
- upgrade "backendless": "^6.4.0"

### v6.5.6 (2022/09/28)
- BKNDLSS-29914 fix an issue hanging receiving tasks after parsing tasks fail
- BKNDLSS-29791 kill cached workers that were finished by timeout

### v6.5.5 (2022/06/10)
- fix creating a UnitOfWork instance in before/after Transaction event handlers

### v6.5.4 (2022/06/07)
- add optional logs for the ManagementServer

### v6.5.3 (2022/04/01)
- upgrade "backendless": "^6.3.14", fix `Error during logs flushing regeneratorRuntime is not defined`

### v6.5.2 (2022/04/01)
- upgrade "backendless": "^6.3.9"

### v6.5.1 (2022/03/24)
- attach some HTTP Headers from received tasks to all requests from the coderunner

### v6.5.0 (2022/03/18)
- improve logging by splitting `verbose` options on two `debug` and `verbose`
- add truncation for long log messages
- stop processing outdated tasks from the queue
- add a specific heartbeat timeout option for `ANALYSE_SERVER_CODE` tasks

### v6.4.5 (2022/03/16)
- fix parsing tasks when compression is enabled

### v6.4.4 (2022/03/10)
- fix ERR_INVALID_ARG_TYPE error when there is no task result and compression is enabled

### v6.4.3 (2022/03/03)
- update configs locations for config/coderunner/compression

### v6.4.2 (2022/03/03)
- update modules
- update configs locations for config/coderunner/rateLimit

### v6.4.1 (2022/03/02)
- add an ability to limit tasks for apps

### v6.3.10 (2022/01/14)
- add `compression.threshold` config 

### v6.3.9 (2022/01/12)
- add support for `before/after Upsert/UpsertBulk` events 

### v6.3.8 (2021/11/25)
- do not cache worker if it fails due to FS error

### v6.3.7 (2021/11/24)
- fix generating a zip file for deploying

### v6.3.6 (2021/11/24)
- upgrade NPM modules to the latest versions
```
"commander":                 "^2.12.2" => "^8.3.0"
"glob":                      "^6.0.4"  => "^7.2.0"
"ioredis":                   "^4.9.0"  => "^4.28.1"
"jszip":                     "^2.6.1"  => "^3.7.1"
"winston":                   "^3.2.1"  => "^3.3.3"
"winston-daily-rotate-file": "^3.8.0"  => "^4.5.5"
"chai":                      "^4.2.0"  => "^4.3.4"
"eslint":                    "^4.19.1" => "^7.32.0"
"mocha":                     "^8.4.0"  => "^9.1.3"
"should":                    "^13.2.1" => "^13.2.3"
"supertest":                 "^3.1.0"  => "^6.1.6"
```

### v6.3.5 (2021/11/12)
- fix pre running idle workers when the caching enabled

### v6.3.4 (2021/11/11)
- add pre running idle workers

### v6.3.3 (2021/11/03)
- improve logging for the master process
- fix using sentinel auth
- upgrade `JS-SDK` to v6.3.2

### v6.3.2 (2021/11/02)
- enable using sentinel auth

### v6.3.1 (2021/10/07)
- upgrade `JS-SDK` to v6.3.1

### v6.3.0 (2021/09/22)
- fix the problem with timeout when deploying a big business logic, change deployment process to asynchronous 
- upgrade `JS-SDK` to v6.2.25

### v6.2.1 (2021/07/27)
- upgrade `JS-SDK` to v6.2.22

### v6.2.0 (2021/07/10)
- upgrade `JS-SDK` to v6.2.20
- add "before/afterGroup" and "before/afterCountInGroup" Event Handlers for the Data Service
- add support for Event Handlers of the Cache and AtomicOperation Services

### v6.1.12 (2021/05/20)
- temporary rollback changes related to customDomain
- upgrade `JS-SDK` to v6.2.11

### v6.1.11 (2021/05/19)
- fix using of httpProtocol for initializing the JS-SDK

### v6.1.10 (2021/05/19)
- add an ability to init the JS-SDK with custom domain only

### v6.1.9 (2021/03/15)
- fix killing stuck workers 

### v6.1.8 (2021/03/15)
- add `appId` to the process title 

### v6.1.7 (2021/02/23)
- improve the performance of json stringification 
- upgrade `JS-SDK` to v6.2.3
- upgrade `backendless-consul-config-provider` module to v1.0.15

### v6.1.6 (2020/12/17)
- remove legacy GEO API
- upgrade `JS-SDK` to v6.1.8
- upgrade `backendless-consul-config-provider` module to v1.0.14

### v6.1.5 (2020/11/12)
- improve getting current statistics about workers
- resolve worker only after app logs are flushed to the server
- add an observer for workers load to detect when there are not enough workers 

### v6.1.4 (2020/11/03)
- add support for `before/after OAuth login/register` events 

### v6.1.3 (2020/10/30)
- add support for `before/after transaction` events 
- upgrade `JS-SDK` to v6.1.4

### v6.1.2 (2020/10/16)
- fix `PersistenceItem` API for loading object by id 
- upgrade `JS-SDK` to v6.1.2

### v6.1.1 (2020/09/24)
- fix problem with unkillable workers when worker's cache is disabled

### v6.1.0 (2020/09/21)
- add graceful shutdown, the JS-CodeRunner will wait until complete all the taken tasks    

### v6.0.2 (2020/07/08)
- fix traffic compression between server and coderunner and config prop names

### v6.0.1 (2020/07/07)
- add traffic compression between server and coderunner
- upgrade `JS-SDK` to v6.0.6

### v6.0.0 (2020/06/15)
- upgrade `JS-SDK` to v6.0.0

### v5.5.0 (2020/05/29)
- provide public config in Backendless.Config
- put fileDownloadUrl, publicAPIUrl and internalAPIUrl to Backendless.Config

### v5.4.11 (2020/05/15)
- fix a problem when EventHandler fails with "not existing user token" 

### v5.4.10 (2020/05/07)
- upgrade `JS-SDK` to v5.8.12
- add "beforeLoginAsGuest" and "afterLoginAsGuest" Event Handlers

### v5.4.9 (2020/03/11)
- upgrade `JS-SDK` to v5.8.6

### v5.4.8 (2020/02/21)
- upgrade `JS-SDK` to v5.7.2

### v5.4.7 (2020/02/07)
- fix a problem with initializing JS-SDK

### v5.4.6 (2020/01/09)
- upgrade `JS-SDK` to v5.7.1

### v5.4.5 (2019/10/28)
- remove setting "access-control-expose-headers" response HTTP header

### v5.4.4 (2019/08/30)
- upgrade `JS-SDK` to v5.4.3
- fix a problem when specified custom headers are not accessible in Web Browser   

### v5.4.3 (2019/08/22)
- upgrade `JS-SDK` to v5.4.2 

### v5.4.2 (2019/08/13)
- add an ability to specify HTTP Response Headers 

### v5.4.0 (2019/07/09)
- upgrade `JS-SDK` to v5.4.0 
- add EventHandlers for EmailTemplates 

### v5.2.8 (2019/07/08)
- add "msgBroker.ssl" config option for quick enabling SSL connection to Redis 

### v5.2.7 (2019/07/04)
- add Redis TSL config mapping for Consul  
- upgrade `backendless-consul-config-provider` module to v1.0.13

### v5.2.6 (2019/04/24)
- upgrade `backendless-consul-config-provider` module to v1.0.12

### v5.2.5 (2019/04/24)
- upgrade `backendless-consul-config-provider` module to v1.0.11

### v5.2.4 (2019/04/24)
- upgrade `backendless-consul-config-provider` module to v1.0.10

### v5.2.3 (2019/04/24)
- add Sentinel Support

### v5.2.2 (2019/03/25)
- fix issue with concurrent workers when caching is not enabled

### v5.2.1 (2019/03/13)
- fix incorrect cloud workers stopping with winston logger enabled 

### v5.2.0 (2019/03/05)
- add an ability to put worker's logs into file 

### v5.1.1 (2019/02/26)
- fix composing run options from Consul 

### v5.1.0 (2019/02/20)
- add an ability to process tasks with low-priority
- fix reconnection to redis after redis restart 
- upgrade Backendless JS-SDK to v5.2.7

### v5.0.5 (2019/02/03)
- upgrade Backendless JS-SDK to v5.2.5

### v5.0.4 (2019/02/01)
- upgrade Backendless JS-SDK to v5.2.3
- fix message about "Worker expiration by heartbeat timeout"

### v5.0.3 (2019/01/30)
- upgrade Backendless JS-SDK to v5.2.1

### v5.0.2 (2019/01/22)
- fix: no tasks execution in debug mode

### v5.0.1 (2018/11/26)
- upgrade dependency Backendless JS-SDK to version `^5.2.0`

### v5.0.0 (2018/11/19)
- add workers caching for Backendless PRO and Manage installations, it reduces invocation time of any Business Logic to almost 4 times  
- add Consul as Config Manager, for using shared configs 
- add Management HTTP Server for getting current state of workers
- add various Log Providers like: `file`, `logstash`, `papertrail` 

### v4.7.2 (2018/08/29)
- now `req` object in `before|after` DeleteFileOrDirectory EventHandler contains `pattern` and `recursive` values 

### v4.7.1 (2018/07/27)
- remove config file from cache after reading 

### v4.7.0 (2018/07/18)
- now methods of `child_process` module are not accessible in Cloud

### v4.6.7 (2018/07/03)
- add `--zip-size-confirmation` command line argument to confirm generated zip size before deploying it

### v4.6.6 (2018/06/18)
- fixed `runner is already attached` error when re-run coderunner in debug mode  

### v4.6.5 (2018/06/07)
- add process id to every Backendless.logging message
- add app id (or its alias) to every stdout message
- update Backendless and dev dependencies

### v4.6.4 (2018/04/25)
- fix: PersistenceItem.save ignores ownerId if it's the only property in the payload
- upgrade dev dependencies

### v4.6.2 (2018/04/18)
- upgrade dependency Backendless JS-SDK to version `^4.4.3`

### v4.6.1 (2018/04/04)
- remove `tableName` argument from bulkCreate EventHandler 

### v4.6.0 (2018/04/03)
- add bulkCreate EventHandlers
- add bulkCreate method to PersistenceItem

### v4.5.4 (2018/03/09)
- add `deletable` option to `PersistenceItem.saveWithRelations` method allowing auto deletion of 1:1 or 1:N relations

### v4.5.3 (2018/03/05)
- stop dead workers on timeout in `cloud` and `pro` modes

### v4.5.0 (2018/02/19)
- code deployment is now 5 times faster

### v4.4.8 (2018/02/13)
- upgrade dependency Backendless JS-SDK to version `^4.3.4`
- add Messaging Event Handlers: 
  - beforePush
  - afterPush
  - beforePushWithTemplate
  - afterPushWithTemplate

### v4.4.6 (2018/01/24)
- upgrade dependency Backendless JS-SDK to version `^4.3.2`

### v4.4.5 (2018/01/04)
- add duplicateStrategy option allowing service or models subclasses

### v4.4.4 (2017/12/25)
- fix: 'Nothing to debug/deploy' error when only timers are present
- fix: PersistenceItem.saveWithRelations ignores deep stale

### v4.4.3 (2017/11/12)
- update dependencies (including backendless JS SDK)
- fix: 'call stack issue' when deploy service with circular dependencies in JSDOC
- add unhandled promise rejection printing to log
- PersistenceItem constructor now can accept string with objectId now
- PersistenceItem.find method works with plain object and simple 'where' strings
- add PersistenceItem.deleteRelation method
- add PersistenceItem.ref method convenient to minimize payload for model update requests

### v4.4.1 (2017/11/7)
- update dependencies

### v4.4.0 (2017/10/20)
- add static methods: count, save, bulkUpdate to PersistenceItem
- add saveWithRelations method to PersistenceItem
- PersistenceItem constructor now accepts arguments
- fix: undefined service path in model build output
- fix: geo points are not mapped to Backendless.GeoPoint
- Don't send relation props to server when saving PersistenceItem
- Don't send request to server if no props to save when saving PersistenceItem
- Always print business logic error stack to console during tasks execution (unless it's timeout error)
- print task execution time
- update Backendless JS SDK dependency to latest

### v4.3.6 (2017/09/21)
- Update Backendless JS SDK to version 4.0.10

### v4.3.5 (2017/09/19)
- Update Backendless Request to version 0.0.8
- No sandbox for Market Place business logic
- add bulkRemove and fetch methods to PersistenceItem

### v4.3.4 (2017/09/04)
- Apply current user id before service method execution

### v4.3.3 (2017/08/18)
- add missed `response` argument in `Users.afterFind` handler

### v4.3.2 (2017/08/11)
- add missed `response` argument in `Messaging.afterDeviceRegistration` handler

### v4.3.1 (2017/07/06)
- Change events handlers params
- Remove media events

### v4.3.0 (2017/07/04)
- Backendless Server v4.0 support (new communication protocol, deployment models)
- Service Methods may have specific route defined in a jsdoc `@route` tag. Route may include path params like `/order/{orderId}/item/{itemId}`
- Service and service methods description defined in jsdoc is visible in Backendless Dev Console
- In service method there is `this.request` containing the execution context including http path, headers, path params,
query params, user, user roles and so on
- Service constructor now accepts service config and execution context arguments
- Add `Backendless.Request` giving a possibility to make one liner http requests from BL
- userToken of a user originated the BL execution is now injected into every Backendless API call made from the BL
- fix invalid object references calculations during json parse if object contains `___dates___` meta fields
- decorate dates into `___dates___` metafields in a response to the server
- add `setRelation` and `addRelation` methods to `PersistenceItem` class
- add support for async service methods
- fix processing files whose names start with underscore
- Standalone work in `cloud` mode. CodeRunnerDriver is not required anymore.
- `app.files` config param was replaced by `app.exclude`. Coderunner now searches for all files in the current working
directory except those that matches `app.exclude` patterns
- add retry strategy for messages broker
- add `Backendless.ServerCode.Data` alias to `Backendless.ServerCode.Persistence`
- stop logs sending attempt for RAI tasks

### v1.11.0 (2017/02/20)
- add `Backendless.ServerCode.verbose()` method, giving a possibility to enable verbose logging mode

### v1.10.1 (2016/11/25)
- update Backendless SDK dependency to latest

### v1.9.1 (2016/11/22)
- resolve ___dates___ meta fields in server's JSON
- when critical error, exit with zero status code to avoid too noisy NPM complains

### v1.9.0 (2016/10/25)
- add `PRO` mode

### v1.8.0 (2016/08/17)
- in `CLOUD` mode the CodeRunner forwards all console logging 
(including CodeRunner task processing info) to `Backendless.Logging` which makes it possible to 
monitor deployed Business Logic
- When run in production, the CodeRunner now prints how much times it takes, to load a context specific 
business logic modules and their dependencies 

### v1.7.4 (2016/07/14)
- fix: `false` returned from service's method results in `null` result on client side

### v1.7.3 (2016/07/01)
- fix `HashMap cannot be cast to InvocationResult` error when invoking service method which returns non string value

### v1.7.2 (2016/06/14)
- change: same response shape for each task executors

### v1.7.1 (2016/06/08)
- fix `Can not parse generic service` error when publish service with third-party dependencies

### v1.7.0 (2016/06/01)
- show error line number in model summary output
- in 'verbose' mode print full stack trace of the module validation errors
- wrap a value returned from custom event handler into an object ({result: value})
except those cases where the value is already an object

### v1.6.0 (2016/05/25)
- multiple services is now allowed to deploy
- default service version is `1.0.0` (was `0.0.0`)

### v1.5.6 (2016/05/23)
- fix `timeout error` when custom event handler returns a `Function`
- fix publisher bug related to npm2 env and a module used by two other modules

### v1.5.5 (2016/05/16)
- update `eslint`, `backendless` to their latest versions
- fix `undefined` custom event name in model summary output
- remove redundant `(debug)` suffix from service name being registered for `debug`

### v1.5.4 (2016/04/28)
- fix `service not found` error in `cloud` mode
- increase server code parsing time in `cloud` mode

### v1.5.3 (2016/04/28)
- add temporary limitation to single service in deployment
- update `eslint`, `should`, `jszip` and `request` to their latest versions
- change service meta in the result of `PARSE-SERVICE` task as it is required by server
- make single call to api engine to register all debug services

### v1.5.2 (2016/04/28)
- optimize a list of dependencies included to the deployment in `npm3` env
- fix Runner can't find the code deployed from Windows machine

### v1.5.1 (2016/04/27)
- fix deployment does not include all dependencies in `npm3` env

### v1.5.0 (2016/04/27)
- update `backendless.js` to `v3.1.8`
- fix non-obvious error message (`handler not found`) that occurs in `cloud` mode at the time of script loading
- don't allow to deploy a server code that contains errors to production
- include all non dev dependencies into deployment zip
- print ServerCode error stack if run in verbose mode

### v1.4.2 (2016/04/25)
- fix `service not found` error in cloud mode
- make it possible to specify application files path pattern from command line
- in `debug` mode replace confusing service deployed message by service registered

### v1.4.1 (2016/04/25)
- update `backendless.js` dependency to `v3.1.7`

### v1.4.0 (2016/04/23)
- add support for services
- upgrade `redis` client to `v2.5.3`
- print more information about discovered business logic
