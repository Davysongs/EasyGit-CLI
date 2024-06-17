// index.test.js
import { jest } from '@jest/globals';
import simpleGit from 'simple-git';
import { GoogleGenerativeAI } from '@google/generative-ai';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { program } from 'commander';

dotenv.config();

// Mock external dependencies
jest.mock('simple-git');
jest.mock('@google/generative-ai');
jest.mock('inquirer');
jest.mock('dotenv');

describe('Git CLI', () => {
  let git;
  let genAI;
  let model;

  beforeEach(() => {
    git = {
      init: jest.fn().mockResolvedValue(true),
      add: jest.fn().mockResolvedValue(true),
      commit: jest.fn().mockResolvedValue(true),
      branch: jest.fn().mockResolvedValue(true),
      addRemote: jest.fn().mockResolvedValue(true),
      push: jest.fn().mockResolvedValue(true),
      status: jest.fn().mockResolvedValue({ not_added: [] }),
      diff: jest.fn().mockResolvedValue(''),
      reset: jest.fn().mockResolvedValue(true)
    };
    simpleGit.mockReturnValue(git);

    genAI = {
      generateContent: jest.fn()
    };
    model = { generateContent: genAI.generateContent };
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn(() => model)
    }));

    inquirer.prompt.mockResolvedValue({ repo: 'https://github.com/user/repo.git' });
    dotenv.config.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('first-push command initializes, adds, commits, and pushes to remote repo', async () => {
    const { firstPush } = require('./index');

    // Simulate running the first-push command
    await execSync('node index.js first-push https://github.com/user/repo.git');

    expect(git.init).toHaveBeenCalled();
    expect(git.add).toHaveBeenCalledWith('.');
    expect(git.commit).toHaveBeenCalledWith(['initial Commit']);
    expect(git.branch).toHaveBeenCalledWith(['-M', 'main']);
    expect(git.addRemote).toHaveBeenCalledWith('origin', 'https://github.com/user/repo.git');
    expect(git.push).toHaveBeenCalledWith('origin', 'main', ['-u']);
  });

  test('push command generates commit message, adds, commits, and pushes changes', async () => {
    const commitMessage = {
      subject: 'Test commit',
      body: 'This is a test commit message.'
    };

    genAI.generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(commitMessage)
      }
    });

    const { pushChanges } = require('./index');

    // Simulate running the push command
    await execSync('node index.js push');

    expect(git.diff).toHaveBeenCalled();
    expect(git.status).toHaveBeenCalled();
    expect(genAI.generateContent).toHaveBeenCalled();
    expect(git.add).toHaveBeenCalledWith('.');
    expect(git.commit).toHaveBeenCalledWith([commitMessage.subject, commitMessage.body]);
    expect(git.push).toHaveBeenCalled();
  });
});
