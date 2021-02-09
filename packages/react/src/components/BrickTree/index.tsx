import React, { memo, useCallback } from 'react';
import {
	clearHovered,
	PageConfigType, DragSourceType,
	ROOT,
	STATE_PROPS,
} from '@brickd/core';
import { useSelector } from '@brickd/redux-bridge';
import SortTree from './SortTree';
import styles from './index.less';
import { onDragover, onDrop } from '../../common/events';

interface BrickTreeProps {
	className?: string
}

function BrickTree(props: BrickTreeProps) {
	const { pageConfig,dragSource } = useSelector<
		{ pageConfig: PageConfigType,
			dragSource:DragSourceType
		},
		STATE_PROPS
	>(['pageConfig','dragSource'], (prevState, nextState) => {
		const {
			pageConfig: { [ROOT]: prevRoot },
			dragSource:prevDragSource
		} = prevState;
		const {
			pageConfig: { [ROOT]: root },
			dragSource
		} = nextState;
		return !!(!prevRoot && root)||prevDragSource!==dragSource;
	});
	const onMouseLeave = useCallback((e: any) => {
		e.stopPropagation();
		clearHovered();
	}, []);

	if (!pageConfig[ROOT]) return null;
	const { className } = props;
	return (
		<div
			onDrop={dragSource&&onDrop}
			onDragOver={onDragover}
			onMouseLeave={onMouseLeave}
			className={`${styles['sort-container']} ${className}`}
		>
			<SortTree
				disabled
				childNodes={[ROOT]}
				specialProps={{ key: ROOT, domTreeKeys: [], parentKey: '' }}
				componentName={''}
			/>
		</div>
	);
}

export default memo(BrickTree);
