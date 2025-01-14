import {
  Match,
  Route,
  RouteHooks,
  QContext,
  NavigateOptions,
  ResolveOptions,
} from "../index";
import NavigoRouter from "../index";
import {
  pushStateAvailable,
  matchRoute,
  parseQuery,
  extractGETParameters,
  isFunction,
  isString,
  clean,
  parseNavigateOptions,
  windowAvailable,
  getCurrentEnvURL,
  accumulateHooks,
} from "./utils";
import Q from "./Q";
import setLocationPath from "./middlewares/setLocationPath";
import matchPathToRegisteredRoutes from "./middlewares/matchPathToRegisteredRoutes";
import checkForDeprecationMethods from "./middlewares/checkForDeprecationMethods";
import checkForForceOp from "./middlewares/checkForForceOp";
import updateBrowserURL from "./middlewares/updateBrowserURL";
import processMatches from "./middlewares/processMatches";

import { notFoundLifeCycle } from "./lifecycles";

export default function Navigo(
  appRoute?: string,
  resolveOptions?: ResolveOptions
) {
  let DEFAULT_RESOLVE_OPTIONS: ResolveOptions = resolveOptions || {
    strategy: "ONE",
    hash: false,
    noMatchWarning: false,
  };
  let self: NavigoRouter = this;
  let root = "/";
  let current: Match[] = null;
  let routes: Route[] = [];
  let destroyed = false;
  let genericHooks: RouteHooks;

  const isPushStateAvailable = pushStateAvailable();
  const isWindowAvailable = windowAvailable();

  if (!appRoute) {
    console.warn(
      'Navigo requires a root path in its constructor. If not provided will use "/" as default.'
    );
  } else {
    root = clean(appRoute);
  }

  function _checkForAHash(url: string): string {
    if (url.indexOf("#") >= 0) {
      if (DEFAULT_RESOLVE_OPTIONS.hash === true) {
        url = url.split("#")[1] || "/";
      } else {
        url = url.split("#")[0];
      }
    }
    return url;
  }

  function composePathWithRoot(path: string) {
    return clean(`${root}/${clean(path)}`);
  }
  function createRoute(
    path: string | RegExp,
    handler: Function,
    hooks: RouteHooks[],
    name?: string
  ): Route {
    path = isString(path) ? composePathWithRoot(path as string) : path;
    return {
      name: name || clean(String(path)),
      path,
      handler,
      hooks: accumulateHooks(hooks),
    };
  }

  // public APIs
  function on(
    path: string | Function | Object | RegExp,
    handler?: Function,
    hooks?: RouteHooks
  ) {
    if (typeof path === "object" && !(path instanceof RegExp)) {
      Object.keys(path).forEach((p) => {
        if (typeof path[p] === "function") {
          this.on(p, path[p]);
        } else {
          const { uses: handler, as: name, hooks } = path[p];
          routes.push(createRoute(p, handler, [genericHooks, hooks], name));
        }
      });
      return this;
    } else if (typeof path === "function") {
      hooks = handler as RouteHooks;
      handler = path as Function;
      path = root;
    }
    routes.push(
      createRoute(path as string | RegExp, handler, [genericHooks, hooks])
    );
    return this;
  }
  function resolve(
    currentLocationPath?: string,
    options?: ResolveOptions
  ): false | Match[] {
    const context: QContext = {
      instance: self,
      currentLocationPath,
      navigateOptions: {},
      resolveOptions: options || DEFAULT_RESOLVE_OPTIONS,
    };
    Q(
      [
        setLocationPath,
        matchPathToRegisteredRoutes,
        Q.if(
          ({ matches }: QContext) => {
            // console.log(`${currentLocationPath} -> Matches: ${matches.length}`);
            return matches && matches.length > 0;
          },
          processMatches,
          notFoundLifeCycle
        ),
      ],
      context
    );

    return context.matches ? context.matches : false;
  }
  function navigate(to: string, navigateOptions?: NavigateOptions): void {
    to = `${clean(root)}/${clean(to)}`;
    const context: QContext = {
      instance: self,
      to,
      navigateOptions: navigateOptions || {},
      resolveOptions:
        navigateOptions && navigateOptions.resolveOptions
          ? navigateOptions.resolveOptions
          : DEFAULT_RESOLVE_OPTIONS,
      currentLocationPath: _checkForAHash(to),
    };
    Q(
      [
        checkForDeprecationMethods,
        checkForForceOp,
        matchPathToRegisteredRoutes,
        Q.if(
          ({ matches }: QContext) => matches && matches.length > 0,
          processMatches,
          notFoundLifeCycle
        ),
        updateBrowserURL,
      ],
      context
    );
  }
  function off(what: string | RegExp | Function) {
    this.routes = routes = routes.filter((r) => {
      if (isString(what)) {
        return clean(r.path as string) !== clean(what as string);
      } else if (isFunction(what)) {
        return what !== r.handler;
      }
      return String(r.path) !== String(what);
    });
    return this;
  }
  function listen() {
    if (isPushStateAvailable) {
      this.__popstateListener = () => {
        resolve();
      };
      window.addEventListener("popstate", this.__popstateListener);
    }
  }
  function destroy() {
    this.routes = routes = [];
    if (isPushStateAvailable) {
      window.removeEventListener("popstate", this.__popstateListener);
    }
    this.destroyed = destroyed = true;
  }
  function notFound(handler, hooks?: RouteHooks) {
    self._notFoundRoute = createRoute(
      "*",
      handler,
      [genericHooks, hooks],
      "__NOT_FOUND__"
    );
    return this;
  }
  function updatePageLinks() {
    if (!isWindowAvailable) return;
    findLinks().forEach((link) => {
      if (!link.hasListenerAttached) {
        link.addEventListener("click", function (e) {
          if (
            (e.ctrlKey || e.metaKey) &&
            e.target.tagName.toLowerCase() === "a"
          ) {
            return false;
          }
          let location = link.getAttribute("href");
          if (typeof location === "undefined" || location === null) {
            return false;
          }
          // handling absolute paths
          if (location.match(/^(http|https)/) && typeof URL !== "undefined") {
            try {
              const u = new URL(location);
              location = u.pathname + u.search;
            } catch (err) {}
          }
          const options = parseNavigateOptions(
            link.getAttribute("data-navigo-options")
          );

          if (!destroyed) {
            e.preventDefault();
            e.stopPropagation();
            self.navigate(clean(location), options);
          }
        });
        link.hasListenerAttached = true;
      }
    });
    return self;
  }
  function findLinks() {
    if (isWindowAvailable) {
      return [].slice.call(document.querySelectorAll("[data-navigo]"));
    }
    return [];
  }
  function link(path: string) {
    return `/${root}/${clean(path)}`;
  }
  function setGenericHooks(hooks: RouteHooks) {
    genericHooks = hooks;
    return this;
  }
  function lastResolved(): Match[] | null {
    return current;
  }
  function generate(name: string, data?: Object): string {
    const result = routes.reduce((result, route) => {
      let key;

      if (route.name === name) {
        result = route.path as string;
        for (key in data) {
          result = result.replace(":" + key, data[key]);
        }
      }
      return result;
    }, "");
    return !result.match(/^\//) ? `/${result}` : result;
  }
  function getLinkPath(link) {
    return link.getAttribute("href");
  }
  function pathToMatchObject(path: string): Match {
    const [url, queryString] = extractGETParameters(clean(path));
    const params = queryString === "" ? null : parseQuery(queryString);
    const route = createRoute(url, () => {}, [genericHooks], url);
    return {
      url,
      queryString,
      route,
      data: null,
      params: params,
    };
  }
  function getCurrentLocation(): Match {
    return pathToMatchObject(
      clean(getCurrentEnvURL(root)).replace(new RegExp(`^${root}`), "")
    );
  }
  function directMatchWithRegisteredRoutes(path: string): false | Match[] {
    const context: QContext = {
      instance: self,
      currentLocationPath: path,
      navigateOptions: {},
      resolveOptions: DEFAULT_RESOLVE_OPTIONS,
    };
    matchPathToRegisteredRoutes(context, () => {});
    return context.matches ? context.matches : false;
  }
  function directMatchWithLocation(
    path: string,
    currentLocation?: string
  ): false | Match {
    const context: QContext = {
      instance: self,
      currentLocationPath: currentLocation,
    };
    setLocationPath(context, () => {});
    path = clean(path);
    const match = matchRoute(context.currentLocationPath, {
      name: path,
      path,
      handler: () => {},
      hooks: {},
    });
    return match ? match : false;
  }
  function addHook(
    type: string,
    route: Route | string,
    func: Function
  ): Function {
    if (typeof route === "string") {
      route = getRoute(route);
    }
    if (route) {
      if (!route.hooks[type]) route.hooks[type] = [];
      route.hooks[type].push(func);
      return () => {
        (route as Route).hooks[type] = (route as Route).hooks[type].filter(
          (f) => f !== func
        );
      };
    } else {
      console.warn(`Route doesn't exists: ${route}`);
    }
    return () => {};
  }
  function getRoute(nameOrHandler: string | Function): Route | undefined {
    if (typeof nameOrHandler === "string") {
      return routes.find((r) => r.name === composePathWithRoot(nameOrHandler));
    }
    return routes.find((r) => r.handler === nameOrHandler);
  }

  this.root = root;
  this.routes = routes;
  this.destroyed = destroyed;
  this.current = current;

  this.on = on;
  this.off = off;
  this.resolve = resolve;
  this.navigate = navigate;
  this.destroy = destroy;
  this.notFound = notFound;
  this.updatePageLinks = updatePageLinks;
  this.link = link;
  this.hooks = setGenericHooks;
  this.extractGETParameters = (url) =>
    extractGETParameters(_checkForAHash(url));
  this.lastResolved = lastResolved;
  this.generate = generate;
  this.getLinkPath = getLinkPath;
  this.match = directMatchWithRegisteredRoutes;
  this.matchLocation = directMatchWithLocation;
  this.getCurrentLocation = getCurrentLocation;
  this.addBeforeHook = addHook.bind(this, "before");
  this.addAfterHook = addHook.bind(this, "after");
  this.addAlreadyHook = addHook.bind(this, "already");
  this.addLeaveHook = addHook.bind(this, "leave");
  this.getRoute = getRoute;
  this._pathToMatchObject = pathToMatchObject;
  this._clean = clean;
  this._checkForAHash = _checkForAHash;
  this._setCurrent = (c) => (current = self.current = c);

  listen.call(this);
  updatePageLinks.call(this);
}
