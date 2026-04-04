module.exports = function (plop) {
  plop.setGenerator("test", {
    description: "Create a Jest test file",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the component/module to test?",
      },
      {
        type: "input",
        name: "path",
        message:
          "Where should the test file be created? (e.g., src/components)",
        default: "src",
      },
    ],
    actions: [
      {
        type: "add",
        path: "{{path}}/{{name}}.test.js",
        templateFile: "templates/test.hbs",
      },
    ],
  });
};
