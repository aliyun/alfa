function isAboutBlank(loc) {
  return loc && loc.href.startsWith('about:blank');
}

class Location {
  constructor(location) {
    return new Proxy({}, {
      set(target, name, value) {
        switch (name) {
          case 'href':
            break;
          default:
            location[name] = value;
        }
        return true;
      },

      get(target, name) {
        switch (name) {
          case 'reload':
            return () => window.location.reload();
          case 'replace':
            return () => {};
          case 'toString':
            return () => {
              try {
                return isAboutBlank(location) ? window.location.toString() : location.toString();
              } catch (e) {
                return isAboutBlank(location) ? window.location.href : location.href;
              }
            };
          default:
            if (typeof location[name] === 'function') {
              return location[name].bind && location[name].bind(target);
            } else if (isAboutBlank(location)) {
              return window.location[name];
            } else {
              return location[name];
            }
        }
      },
    });
  }
}

export default Location;
