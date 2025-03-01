import define from '../../define';
import { createExportFollowingJob } from '@/queue/index';
import ms from 'ms';

export const meta = {
	secure: true,
	requireCredential: true as const,
	limit: {
		duration: ms('1hour'),
		max: 1,
	},
};

export default define(meta, async (ps, user) => {
	createExportFollowingJob(user);
});
