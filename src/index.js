const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');   


async function run() {
  try {
    // Get inputs
    const paths = core.getInput('paths').split(',').map(p => p.trim());
    const configFilePath = core.getInput('config-file');

    // Read configuration file
    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8'));
    const { fileTypes, links, ignore } = config;

    // Get repository information
    const { repository } = github.context.payload;
    const repoOwner = repository.owner.login;
    const repoName = repository.name;

    // Function to update links in a file
    const updateLinksInFile = (filePath) => {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      let updated = false;

      links.forEach(({ old, new: newLink }) => {
        const newLinkValue = newLink.replace('${{ secrets.GITHUB_REPOSITORY }}', `${repoOwner}/${repoName}`);
        const regex = new RegExp(old, 'g');
        if (fileContent.includes(old) && !ignore.includes(old)) {
          fileContent = fileContent.replace(regex, newLinkValue);
          updated = true;
        }
      });

      if (updated) {
        fs.writeFileSync(filePath, fileContent);
      }
    };

    // Iterate through paths and update links
    paths.forEach((searchPath) => {
      const files = fs.readdirSync(searchPath);
      files.forEach((file) => {
        const filePath = path.join(searchPath, file);
        const fileExt = path.extname(file).substring(1);
        if (fileTypes.includes(fileExt)) {
          updateLinksInFile(filePath);
        }
      });
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();