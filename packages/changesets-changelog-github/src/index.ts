import type { ChangelogFunctions } from '@changesets/types';
import { getInfo, getInfoFromPullRequest } from '@changesets/get-github-info';
// import { TYPE_TO_HEADING }from "./CONST"

const validateChangelogOpts=(options: Record<string, string> | null)=> {
	if (!options?.repo) {
		throw new Error(
			'Please provide a repo to this changelog generator like this:\n"changelog": ["@svitejs/changesets-changelog-github-compact", { "repo": "org/repo" }]'
		);
	}
}

const changelogFunctions: ChangelogFunctions = {
	getDependencyReleaseLine: async (changesets, dependenciesUpdated, options) => {
		console.log('dependenciesUpdated', changesets, dependenciesUpdated, options);
		if (dependenciesUpdated.length === 0) return '';

		const changesetLink = `- Updated dependencies [${(
			await Promise.all(
				changesets.map(async (cs) => {
					if (cs.commit) {
						const { links } = await getInfo({
							repo: options.repo,
							commit: cs.commit
						});
						return links.commit;
					}
				})
			)
		)
			.filter((_) => _)
			.join(', ')}]:`;

		const updatedDependenciesList = dependenciesUpdated.map(
			(dependency) => `  - ${dependency.name}@${dependency.newVersion}`
		);

		return [changesetLink, ...updatedDependenciesList].join('\n');
	},
  getReleaseLine: async (changeset, type, changelogOpts) => {
		validateChangelogOpts(changelogOpts);
		console.log('changeset', changeset, type, changelogOpts);
		const { summary, commit } = changeset;

			const data= await getInfo({
				repo: changelogOpts?.repo,
				commit: commit
			})


		return `- ${summary}`;

  }
};



export default changelogFunctions;
