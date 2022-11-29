import * as core from '@actions/core';
import * as github from '@actions/github';

import {MigrationStatusObject} from './models';
import {filterMigrations, getChangedFiles, getContent} from './utils';

async function run(): Promise<void> {
  const token = core.getInput('github-token', {required: true});
  const reportOnlyChangedFiles = core.getBooleanInput(
    'report-only-changed-files',
  );
  const createNewComment = core.getBooleanInput('create-new-comment');
  const sourceFilePath = core.getInput('source-file');
  const {context} = github;
  const {repo, owner} = context.repo;
  const {eventName, payload} = context;

  let finalHtml = '';

  const options: {[key: string]: any} = {
    token,
    repository: `${owner}/${repo}`,
    prefix: `${process.env.GITHUB_WORKSPACE}/`,
    createNewComment,
    reportOnlyChangedFiles,
  };

  if (eventName === 'pull_request' && payload.pull_request) {
    options.commit = payload.pull_request.head.sha;
    options.head = payload.pull_request.head.ref;
    options.base = payload.pull_request.base.ref;
  } else if (eventName === 'push') {
    options.commit = payload.after;
    options.head = context.ref;
  }

  if (options.reportOnlyChangedFiles) {
    const changedFiles = await getChangedFiles(options);
    options.changedFiles = changedFiles;

    core.info(`changedFiles: ${changedFiles}`);

    // when github event come different from `pull_request` or `push`
    if (!changedFiles) {
      options.reportOnlyChangedFiles = false;
    }
  }

  let content = getContent(sourceFilePath);
  if (content !== null) {
    core.info(content);
    content = JSON.parse(content);
  } else {
    /// Exit if there are no modified files
    return;
  }

  const interestedMigrations = filterMigrations(
    options.changedFiles.all,
    content as unknown as MigrationStatusObject,
  );

  core.info(JSON.stringify(interestedMigrations));

  finalHtml += '';

  core.info(finalHtml);
}

run();
