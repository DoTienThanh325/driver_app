export default ({ config }) => ({
  ...config,
  web: {
    ...config.web,
    output: process.env.MOBILE_DOCKER_WEB === '1' ? 'single' : config.web?.output,
  },
});
