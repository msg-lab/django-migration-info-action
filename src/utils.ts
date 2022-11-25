import * as fs from 'fs';

import * as core from '@actions/core';
import * as github from '@actions/github';

const FILE_STATUSES = Object.freeze({
  ADDED: 'added',
  MODIFIED: 'modified',
  REMOVED: 'removed',
  RENAMED: 'renamed',
});

// generate object of all files that changed based on commit through Github API
export async function getChangedFiles(options: {[key: string]: string}) {
  try {
    const {context} = github;
    const {eventName, payload} = context;
    const {repo, owner} = context.repo;
    const octokit = github.getOctokit(options.token);

    // Define the base and head commits to be extracted from the payload
    let base = '';
    let head = '';

    switch (eventName) {
      case 'pull_request':
        base = payload.pull_request?.base.sha;
        head = payload.pull_request?.head.sha;
        break;
      case 'push':
        base = payload.before;
        head = payload.after;
        break;
      default:
        // prettier-ignore
        core.warning(`\`report-only-changed-files: true\` supports only on \`pull_request\` and \`push\`, \`${eventName}\` events are not supported.`)
        return null;
    }

    core.startGroup('Changed files');
    // Log the base and head commits
    core.info(`Base commit: ${base}`);
    core.info(`Head commit: ${head}`);

    let response = null;
    // that is first commit, we cannot get diff
    if (base === '0000000000000000000000000000000000000000') {
      response = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: head,
      });
    } else {
      // https://developer.github.com/v3/repos/commits/#compare-two-commits
      response = await octokit.rest.repos.compareCommits({
        base,
        head,
        owner,
        repo,
      });
    }

    // Ensure that the request was successful.
    if (response.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${response.status}, expected 200. ` +
          "Please submit an issue on this action's GitHub repo.",
      );
    }

    // Get the changed files from the response payload.
    const files = response.data.files;
    const all = [];
    const added = [];
    const modified = [];
    const removed = [];
    const renamed = [];
    const addedModified = [];

    if (files) {
      for (const file of files) {
        const {filename: filenameOriginal, status} = file;
        const filename = filenameOriginal.replace(options.pathPrefix, '');

        all.push(filename);

        switch (status) {
          case FILE_STATUSES.ADDED:
            added.push(filename);
            addedModified.push(filename);
            break;
          case FILE_STATUSES.MODIFIED:
            modified.push(filename);
            addedModified.push(filename);
            break;
          case FILE_STATUSES.REMOVED:
            removed.push(filename);
            break;
          case FILE_STATUSES.RENAMED:
            renamed.push(filename);
            break;
          default:
            // prettier-ignore
            core.setFailed(`One of your files includes an unsupported file status '${status}', expected ${Object.values(FILE_STATUSES).join(',')}.`);
        }
      }
    }

    core.info(`All: ${all.join(',')}`);
    core.info(`Added: ${added.join(', ')}`);
    core.info(`Modified: ${modified.join(', ')}`);
    core.info(`Removed: ${removed.join(', ')}`);
    core.info(`Renamed: ${renamed.join(', ')}`);
    core.info(`Added or modified: ${addedModified.join(', ')}`);

    core.endGroup();

    return {
      all,
      [FILE_STATUSES.ADDED]: added,
      [FILE_STATUSES.MODIFIED]: modified,
      [FILE_STATUSES.REMOVED]: removed,
      [FILE_STATUSES.RENAMED]: renamed,
      AddedOrModified: addedModified,
    };
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

export function getPathToFile(pathToFile: string) {
  if (!pathToFile) {
    return null;
  }

  // suports absolute path like '/tmp/pytest-coverage.txt'
  return pathToFile.startsWith('/')
    ? pathToFile
    : `${process.env.GITHUB_WORKSPACE}/${pathToFile}`;
}

export function getContentFile(pathToFile: string): string | null {
  if (!pathToFile) {
    return null;
  }

  const fileExists = fs.existsSync(pathToFile);

  if (!fileExists) {
    core.warning(`File "${pathToFile}" doesn't exist`);
    return null;
  }

  const content = fs.readFileSync(pathToFile, 'utf8');

  if (!content) {
    core.warning(`No content found in file "${pathToFile}"`);
    return null;
  }

  core.info(`File read successfully "${pathToFile}"`);

  core.info(content);
  return content;
}

export function getContent(filePath: string) {
  try {
    const fullFilePath = getPathToFile(filePath);

    if (fullFilePath) {
      const content = getContentFile(fullFilePath);

      return content;
    }
  } catch (error: any) {
    core.error(`Could not get content of "${filePath}". ${error.message}`);
  }

  return null;
}
