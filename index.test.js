const inquirer = require('inquirer');
const simpleGit = require('simple-git');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

jest.mock('inquirer');
jest.mock('simple-git');
jest.mock('@google/generative-ai');

// Mock data and functions
const mockGit = {
  init: jest.fn(),
  add: jest.fn(),
  commit: jest.fn(),
  branch: jest.fn(),
  addRemote: jest.fn(),
  push: jest.fn(),
  diff: jest.fn(),
  status: jest.fn(),
  reset: jest.fn(),
};

simpleGit.mockReturnValue(mockGit);

const mockGenerateContent = jest.fn();
GoogleGenerativeAI.mockImplementation(() => ({
  getGenerativeModel: () => ({
    generateContent: mockGenerateContent,
  }),
}));

describe('Git CLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize, add, commit, and push to a remote repo for first-push command', async () => {
    const repoUrl = 'https://github.com/user/repo.git';

    inquirer.prompt.mockResolvedValueOnce({ repo: repoUrl });

    mockGit.init.mockResolvedValueOnce();
    mockGit.add.mockResolvedValueOnce();
    mockGit.commit.mockResolvedValueOnce();
    mockGit.branch.mockResolvedValueOnce();
    mockGit.addRemote.mockResolvedValueOnce();
    mockGit.push.mockResolvedValueOnce();

    await program.parseAsync(['node', 'index.js', 'first-push'], { from: 'user' });

    expect(mockGit.init).toHaveBeenCalled();
    expect(mockGit.add).toHaveBeenCalledWith('.');
    expect(mockGit.commit).toHaveBeenCalledWith(['initial Commit']);
    expect(mockGit.branch).toHaveBeenCalledWith(['-M', 'main']);
    expect(mockGit.addRemote).toHaveBeenCalledWith('origin', repoUrl);
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', ['-u']);
  });

  it('should generate a commit message and push changes for push command', async () => {
    const diffOutput = 'diff --git a/file.txt b/file.txt';
    const statusOutput = { not_added: ['newfile.txt'] };

    mockGit.diff.mockResolvedValueOnce(diffOutput);
    mockGit.status.mockResolvedValueOnce(statusOutput);
    mockGit.reset.mockResolvedValueOnce();

    const generatedMessage = {
      response: {
        text: jest.fn().mockReturnValueOnce(
          JSON.stringify({
            subject: 'Add new feature',
            body: 'Detailed description of the new feature.',
          })
        ),
      },
    };

    mockGenerateContent.mockResolvedValueOnce(generatedMessage);

    await program.parseAsync(['node', 'index.js', 'push'], { from: 'user' });

    expect(mockGit.reset).toHaveBeenCalledWith(['--']);
    expect(mockGit.diff).toHaveBeenCalled();
    expect(mockGit.status).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('generate a commit message for this diff:')
    );
    expect(mockGit.add).toHaveBeenCalledWith('.');
    expect(mockGit.commit).toHaveBeenCalledWith(['Add new feature', 'Detailed description of the new feature.']);
    expect(mockGit.push).toHaveBeenCalled();
  });

  it('should not push changes if there are no changes to commit', async () => {
    mockGit.diff.mockResolvedValueOnce('');
    mockGit.status.mockResolvedValueOnce({ not_added: [] });

    await program.parseAsync(['node', 'index.js', 'push'], { from: 'user' });

    expect(mockGit.diff).toHaveBeenCalled();
    expect(mockGit.status).toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockGit.add).not.toHaveBeenCalled();
    expect(mockGit.commit).not.toHaveBeenCalled();
    expect(mockGit.push).not.toHaveBeenCalled();
  });
});
