'use strict'

Backendless.ServerCode.User.afterRegister((req, res) => {
  if (res.result) {
    return Backendless.UserService.assignRole(res.result.email, 'MyCustomRole')
  }
})