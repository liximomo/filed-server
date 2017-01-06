class paramsRoute {
  constructor(handle) {
    this.handleMap = {};
    this._defaultHandle = handle;
  }

  add(param, handle) {
    (this.handleMap)[param] = handle;
    return this;
  }

  route() {
    return (req, res, next) => {
      let handle = false;
      Object.keys(this.handleMap)
        .map(key => {
          const params = key.split('&')
            .map(query => {
              const paramPattern = key.split('=');
              return {
                name: paramPattern[0],
                value: paramPattern.length > 1 ? paramPattern[1] : null,
              };
            });
          return {
            params,
            handle: (this.handleMap)[key],
          }
        })
        .forEach(pattern => {
          const noMatch = pattern.params.some(param => {
            const isExist = param.name in (req.query);
            const value = (req.query)[param.name];
            const notEqual = param.value != null && param.value !== value;
            return !isExist || notEqual;
          })
          
          if (noMatch) return;
          handle = true;
          pattern.handle(req, res, next);
        });

      if (!handle) {
        if (this._defaultHandle) {
          this._defaultHandle(req, res, next);
        } else {
          next();
        }
      }
    };
  }

}

module.exports = paramsRoute;
