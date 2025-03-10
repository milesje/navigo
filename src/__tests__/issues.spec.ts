import NavigoRouter from "../../index";
import Navigo from "../index";

describe("Given the Navigo library", () => {
  beforeEach(() => {
    history.pushState({}, "", "/");
  });
  describe("and the problem described in #111", () => {
    it("should fallback to that route if no handler is found", () => {
      history.pushState({}, "", "/foo/bar?a=b");
      var handler = jest.fn();
      var notFoundHandler = jest.fn();

      let router = new Navigo("/");
      router.on("/test", handler);
      router.notFound(notFoundHandler);

      router.resolve("/test#some_anchor");

      expect(handler).toBeCalledTimes(1);
      expect(notFoundHandler).not.toBeCalled();
    });
  });
  describe("and the problem described in #116", function () {
    it("should handle properly the parameter", function () {
      var handler = jest.fn();

      let router = new Navigo("/");
      handler = jest.fn();
      router.on("/user/:name", handler);
      router.resolve("/user/Krasimir%20Tsonev");
      expect(handler).toBeCalled();
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          data: { name: "Krasimir Tsonev" },
        })
      );
    });
  });
  describe("and the problem described in #128", function () {
    it("should not resolve the route", function () {
      const mock = jest.spyOn(console, "warn").mockImplementation(() => {});
      var handler = jest.fn();

      let router: NavigoRouter = new Navigo("/");
      router.on("/:moduleName", handler);
      router.notFound(() => {});

      router.resolve("/rock/paper/scissors/");

      expect(handler).not.toBeCalled();
      mock.mockRestore();
    });
  });
  describe("and the feature described in #136", function () {
    it("should call the already hook", function () {
      const handler = jest.fn();
      const alreadyHandler = jest.fn();
      const router: NavigoRouter = new Navigo("/");

      router.on("/:moduleName", handler, {
        already: alreadyHandler,
      });

      router.resolve("/rock");
      router.resolve("/rock");
      router.resolve("/rock");
      router.resolve("/rock");

      expect(handler).toBeCalledTimes(1);
      expect(alreadyHandler).toBeCalledTimes(3);
    });
  });
  describe("and the feature described in #146", function () {
    it("should resolve the proper route", function () {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      let router: NavigoRouter = new Navigo("/");

      router.on({
        restaurant: handler1,
        "demo/:name": handler2,
      });

      router.navigate("/demo/my_restaurant");

      expect(handler1).not.toBeCalledTimes(1);
      expect(handler2).toBeCalledTimes(1);
      expect(handler2).toBeCalledWith(
        expect.objectContaining({ data: { name: "my_restaurant" } })
      );
    });
  });
  describe("and the feature described in #147", function () {
    it("should provide an API for changing the history API method", function () {
      const push = jest.spyOn(history, "pushState");
      const replace = jest.spyOn(history, "replaceState");
      const router: NavigoRouter = new Navigo("/");

      router.notFound(() => {});
      router.navigate("/rock1");
      router.navigate("/rock2", { historyAPIMethod: "replaceState" });
      router.navigate("/rock3");

      expect(push).toBeCalledTimes(2);
      expect(replace).toBeCalledTimes(1);

      push.mockRestore();
      replace.mockRestore();
    });
  });
  describe("when we use a hash based URL", function () {
    it("should successfully extract only the URL", function () {
      const { extractGETParameters } = new Navigo("/");
      const url = "/employee?spm=abc#/employee/iParents";

      expect(extractGETParameters(url)).toStrictEqual(["employee", "spm=abc"]);
    });
  });
  describe("when we use a non-hash based routing but we have a hash", function () {
    it("should successfully extract only the URL", function () {
      const { extractGETParameters } = new Navigo("/");
      const url = "/employee?spm=abc#/employee/iParents";

      expect(extractGETParameters(url)).toStrictEqual(["employee", "spm=abc"]);
    });
  });
  describe("and the bug described in #162", function () {
    it("should properly resolve the route handler even tho there is no dynamic param", function () {
      const spy = jest.fn();
      const router: NavigoRouter = new Navigo("/");

      router.on("/home", spy);
      router.resolve("/home?hey=bug");

      expect(spy).toBeCalledWith(
        expect.objectContaining({ url: "home", params: { hey: "bug" } })
      );
    });
  });
  describe("and the issue #167", function () {
    it("should have parameterized routes that work", function () {
      const handler = jest.fn();
      const router: NavigoRouter = new Navigo("/");

      router.on("/products/:id", handler);

      router.resolve("/products/421");

      expect(handler).toBeCalledWith(
        expect.objectContaining({ data: { id: "421" } })
      );
    });
  });
  describe("Given the issue #174", function () {
    it("should call the handler when we pass a hook object but no before and after", function () {
      const handler = jest.fn();
      const router: NavigoRouter = new Navigo("/");
      const alreadyHandler = jest.fn();
      const leaveHandler = jest.fn().mockImplementation((done) => done());
      const aboutHandler = jest.fn();

      router.on("/products/:id", handler, {
        already: alreadyHandler,
        leave: leaveHandler,
      });
      router.on("/about", aboutHandler);

      router.resolve("/products/421");
      router.resolve("/products/421");
      router.resolve("/about");

      expect(handler).toBeCalledTimes(1);
      expect(handler).toBeCalledWith(
        expect.objectContaining({ data: { id: "421" } })
      );
      expect(alreadyHandler).toBeCalledTimes(1);
      expect(alreadyHandler).toBeCalledWith(
        expect.objectContaining({
          data: { id: "421" },
        })
      );
      expect(leaveHandler).toBeCalledTimes(1);
      expect(aboutHandler).toBeCalledTimes(1);
    });
  });
  describe("when we have a `leave` hook into the generic hooks", () => {
    it("should call the hook every time when we leave a route", () => {
      const r: NavigoRouter = new Navigo("/");
      const hooks = {
        leave: jest.fn().mockImplementation((done) => done()),
      };
      const h1 = jest.fn();
      const h2 = jest.fn();

      r.hooks(hooks);

      r.on("/foo/bar", h1);
      r.on("/x/y", h2);
      r.notFound(() => {});

      r.navigate("/foo/bar");
      r.navigate("/x/y");
      r.navigate("/");

      expect(h1).toBeCalledTimes(1);
      expect(h2).toBeCalledTimes(1);
      expect(hooks.leave).toBeCalledTimes(2);
      expect(hooks.leave.mock.calls[0][1]).toMatchObject({
        url: "x/y",
      });
      expect(hooks.leave.mock.calls[1][1]).toMatchObject({
        url: "",
      });
    });
  });
  describe("and the request described in #208", function () {
    it("should allow us to resolve a handler but don't update the browser URL", function () {
      const push = jest.spyOn(history, "pushState");
      const router: NavigoRouter = new Navigo("/");
      const handler = jest.fn();

      router.on("/it-works", handler);
      router.navigate("/it-works", {});

      push.mockRestore();
    });
  });
  describe("and the request described in #245", function () {
    it("should properly resolve the child path without the need of a parent path", function () {
      const router: NavigoRouter = new Navigo("/");
      const handler = jest.fn();

      router
        .on({
          "email-verification/:emailVerificationCode": handler,
        })
        .resolve("/email-verification/x");

      expect(handler).toBeCalledTimes(1);
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          url: "email-verification/x",
          data: { emailVerificationCode: "x" },
        })
      );
    });
  });
  describe("and the problem described in #253", function () {
    it("should properly extract the data from the url", function () {
      const router: NavigoRouter = new Navigo("/");
      const handler = jest.fn();
      const before = jest.fn().mockImplementation((done) => done());
      const after = jest.fn();
      const expectedMatch = expect.objectContaining({
        url: "user/42/save",
        data: ["42", "save"],
      });

      router.on(/user\/(\d+)\/(\w+)\/?/, handler, {
        before,
        after,
      });

      router.navigate("/user/42/save");

      expect(handler).toBeCalledTimes(1);
      expect(handler).toBeCalledWith(expectedMatch);
      expect(before).toBeCalledTimes(1);
      expect(before).toBeCalledWith(expect.any(Function), expectedMatch);
      expect(after).toBeCalledTimes(1);
      expect(after).toBeCalledWith(expectedMatch);
    });
  });
  describe("and the problem described in #262", function () {
    it("should replace the URL but execute the first route", () => {
      history.pushState({}, "", "/abc-1234");
      const router: NavigoRouter = new Navigo("/");
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.on({
        "/abc-1234": {
          as: "routeA",
          uses: handler1,
          hooks: {
            before: (done, match) => {
              router.navigate("/item/abc-1234", {
                historyAPIMethod: "replaceState",
                updateBrowserURL: true,
                updateState: true,
                callHandler: false,
                force: false,
              });
              done();
            },
          },
        },
      });

      router.on({
        "/item/abc-1234": {
          as: "routeB",
          uses: handler2,
        },
      });

      router.resolve();

      expect(handler1).toBeCalledTimes(1);
      expect(handler1).toBeCalledWith(
        expect.objectContaining({
          url: "abc-1234",
        })
      );
      expect(handler2).not.toBeCalled();
      expect(location.pathname).toBe("/item/abc-1234");
    });
  });
});
