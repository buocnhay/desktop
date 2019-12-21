import { Account } from '../../models/account'
import { PullRequest } from '../../models/pull-request'
import { Emitter } from 'event-kit'
import {
  RepositoryWithGitHubRepository,
  isRepositoryWithGitHubRepository,
  Repository,
} from '../../models/repository'
import { PullRequestStore } from '.'
import { PullRequestUpdater } from './helpers/pull-request-updater'
import { RepositoriesStore } from './repositories-store'
import { GitHubRepository } from '../../models/github-repository'

/** Layer between App Store and the Pull Request Store and Pull Request Updater */
export class PullRequestCoordinator {
  protected readonly emitter = new Emitter()
  private currentPullRequestUpdater: PullRequestUpdater | null = null

  public constructor(
    private readonly pullRequestStore: PullRequestStore,
    private readonly repositoriesStore: RepositoriesStore
  ) {}

  /** Register a function to be called when the store updates. */
  public onPullRequestsChanged(
    fn: (
      repository: RepositoryWithGitHubRepository,
      pullRequests: ReadonlyArray<PullRequest>
    ) => void
  ) {
    return this.pullRequestStore.onPullRequestsChanged(
      async (ghRepo, pullRequests) => {
        const repository = findRepositoryForGitHubRepository(
          ghRepo,
          await this.repositoriesStore.getAll()
        )
        if (repository !== undefined) {
          fn(repository, pullRequests)
        }
      }
    )
  }

  /** Register a function to be called when the store updates. */
  public onIsLoadingPullRequests(
    fn: (
      repository: RepositoryWithGitHubRepository,
      isLoadingPullRequests: boolean
    ) => void
  ) {
    return this.pullRequestStore.onIsLoadingPullRequests(
      async (ghRepo, pullRequests) => {
        const repository = findRepositoryForGitHubRepository(
          ghRepo,
          await this.repositoriesStore.getAll()
        )
        if (repository !== undefined) {
          fn(repository, pullRequests)
        }
      }
    )
  }

  /** Loads all pull requests against the given repository. */
  public refreshPullRequests(repository: Repository, account: Account) {}

  public getAllPullRequests(repository: RepositoryWithGitHubRepository) {
    return this.pullRequestStore.getAll(repository.gitHubRepository)
  }

  public startPullRequestUpdater(repository: Repository, account: Account) {
    if (this.currentPullRequestUpdater !== null) {
      this.stopPullRequestUpdater()
    }

    const { gitHubRepository } = repository

    if (account === null || gitHubRepository === null) {
      return
    }

    this.currentPullRequestUpdater = new PullRequestUpdater(
      gitHubRepository,
      account,
      this.pullRequestStore
    )
    this.currentPullRequestUpdater.start()
  }
  public stopPullRequestUpdater() {
    if (this.currentPullRequestUpdater !== null) {
      this.currentPullRequestUpdater.stop()
      this.currentPullRequestUpdater = null
    }
  }
}

function findRepositoryForGitHubRepository(
  gitHubRepository: GitHubRepository,
  repositories: ReadonlyArray<Repository>
) {
  const repo = repositories.find(
    r =>
      r.gitHubRepository !== null &&
      r.gitHubRepository.dbID === gitHubRepository.dbID
  )
  return repo !== undefined && isRepositoryWithGitHubRepository(repo)
    ? repo
    : undefined
}
