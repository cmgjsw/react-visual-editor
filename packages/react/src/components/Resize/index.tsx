import React, {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	PageConfigType,
	resizeChange,
	ResizePayload,
	ROOT,
	SelectedInfoType,
	STATE_PROPS,
} from '@brickd/core';
import { useSelector } from '@brickd/redux-bridge';

import { get, map } from 'lodash';
import { Item } from './Item';
import styles from './index.less';
import {
	formatUnit,
	generateCSS,
	getElementInfo,
	getIframe,
	getIsModalChild,
	getSelectedNode,
	setPosition,
} from '../../utils';
import ActionSheet from '../ActionSheet';

type ResizeState = {
	selectedInfo: SelectedInfoType
	hoverKey: string | null
	pageConfig: PageConfigType
}

export enum Direction {
	top = 'top',
	right = 'right',
	bottom = 'bottom',
	left = 'left',
	topRight = 'topRight',
	bottomRight = 'bottomRight',
	bottomLeft = 'bottomLeft',
	topLeft = 'topLeft',
}

const controlUpdate = (prevState: ResizeState, nextState: ResizeState) => {
	const { selectedInfo, pageConfig, hoverKey } = nextState;
	return (
		prevState.selectedInfo !== selectedInfo ||
		(selectedInfo &&
			(prevState.pageConfig !== pageConfig ||
				(prevState.hoverKey === null && hoverKey !== null) ||
				(prevState.hoverKey !== null && hoverKey === null)))
	);
};

type OriginSizeType = {
	x: number
	y: number
	width: number
	height: number
	minWidth: number | null
	minHeight: number | null
	maxWidth: number | null
	maxHeight: number | null
	direction: Direction
}

function Resize() {
	const iframe = getIframe();
	const { selectedInfo, hoverKey, pageConfig } = useSelector<
		ResizeState,
		STATE_PROPS
	>(['selectedInfo', 'pageConfig', 'hoverKey'], controlUpdate);
	const { selectedKey, domTreeKeys, propName } = selectedInfo || {};
	const resizeRef = useRef<any>();
	const originSizeRef = useRef<OriginSizeType>();
	const sizeResultRef = useRef<ResizePayload>({});
	const widthRef = useRef<any>();
	const heightRef = useRef<any>();
	const baseboardRef = useRef<HTMLDivElement | any>();
	const selectNodeRef = useRef<HTMLElement>();
	const [isOut, setIsOut] = useState<boolean>(true);
	const { props, childNodes } = pageConfig[selectedKey] || {};
	const { width = 'auto', height = 'auto' } = get(props, 'style', {});
	const isModal = useMemo(
		() => getIsModalChild(pageConfig, domTreeKeys),
		[domTreeKeys, pageConfig],
	);
	selectNodeRef.current = useMemo(() => getSelectedNode(selectedKey, iframe), [
		iframe,
		selectedKey,
	]);

	useEffect(() => {
		const contentWindow = iframe!.contentWindow!;
		const changeSize = () => setSelectedBorder();
		contentWindow.addEventListener('mouseup', onMouseUp);
		contentWindow.addEventListener('mousemove', onMouseMove);
		contentWindow.addEventListener('mouseleave', onMouseUp);
		contentWindow.addEventListener('resize', changeSize);
		contentWindow.addEventListener('animationend', changeSize);
		return () => {
			contentWindow.removeEventListener('mouseup', onMouseUp);
			contentWindow.removeEventListener('mousemove', onMouseMove);
			contentWindow.removeEventListener('mousemove', onMouseUp);
			contentWindow.removeEventListener('resize', changeSize);
			contentWindow.removeEventListener('animationend', changeSize);
		};
	}, [isModal]);

	useEffect(() => {
		if (selectedKey) {
			if (selectNodeRef.current) {
				selectNodeRef.current = getSelectedNode(selectedKey, iframe);
				setSelectedBorder();
			} else {
				setSelectedBorder();
			}
		}
	}, [selectedKey, selectNodeRef.current, iframe, pageConfig]);

	if (!selectedKey && resizeRef.current) {
		resizeRef.current.style.display = 'none';
	}

	const onMouseUp = useCallback(() => {
		originSizeRef.current = undefined;
		baseboardRef.current!.style.display = 'none';
		resizeRef.current.style.pointerEvents = 'none';
		resizeRef.current.style.transitionProperty = 'all';
		resizeRef.current.style.transitionDuration = '50ms';

		resizeChange(sizeResultRef.current);
		sizeResultRef.current = {};
	}, [
		originSizeRef.current,
		baseboardRef.current,
		resizeRef.current,
		sizeResultRef.current,
	]);

	const changeBaseboard = () => {
		const {
			body: { scrollWidth, scrollHeight },
		} = iframe!.contentDocument;
		baseboardRef.current!.style.cssText = `
    display:block;
    width:${scrollWidth}px;
    height:${scrollHeight}px
    `;
	};
	const onMouseMove = useCallback(
		(event: MouseEvent) => {
			event.stopPropagation();
			if (originSizeRef.current) {
				const { clientX, clientY } = event;
				const { x, y, direction, height, width } = originSizeRef.current;
				let offsetY = 0;
				let offsetX = 0;
				switch (direction) {
					case Direction.left:
						offsetX = x - clientX;
						break;
					case Direction.right:
						offsetX = clientX - x;
						break;
					case Direction.top:
						offsetY = y - clientY;
						break;
					case Direction.bottom:
						offsetY = clientY - y;
						break;
					case Direction.topLeft:
						offsetY = y - clientY;
						offsetX = x - clientX;
						break;
					case Direction.topRight:
						offsetY = y - clientY;
						offsetX = clientX - x;
						break;
					case Direction.bottomLeft:
						offsetX = x - clientX;
						offsetY = clientY - y;
						break;
					case Direction.bottomRight:
						offsetY = clientY - y;
						offsetX = clientX - x;
						break;
				}
				const heightResult = height + offsetY;
				const widthResult = width + offsetX;
				const {
					minWidth,
					maxHeight,
					maxWidth,
					minHeight,
				} = originSizeRef.current;
				if (
					offsetX !== 0 &&
					(minWidth === null || widthResult >= minWidth) &&
					(maxWidth === null || widthResult <= maxWidth)
				) {
					sizeResultRef.current.width = `${widthResult}px`;
					selectNodeRef.current!.style.width = `${widthResult}px`;
				}
				if (
					offsetY !== 0 &&
					(minHeight === null || heightResult >= minHeight) &&
					(maxHeight === null || heightResult <= maxHeight)
				) {
					sizeResultRef.current.height = `${heightResult}px`;
					selectNodeRef.current!.style.height = `${heightResult}px`;
				}
				showSize(sizeResultRef.current.width, sizeResultRef.current.height);
				setSelectedBorder('pointer-events: auto; transition:none;');
				changeBaseboard();
			}
		},
		[originSizeRef.current, sizeResultRef.current, selectNodeRef.current],
	);

	const showSize = useCallback(
		(width?: string, height?: string) => {
			if (width) {
				widthRef.current.innerHTML = width;
			}
			if (height) {
				heightRef.current.innerHTML = height;
			}
		},
		[heightRef.current, widthRef.current],
	);

	const setSelectedBorder = (css = '') => {
		if (selectNodeRef.current) {
			const { left, top, width, height } = getElementInfo(
				selectNodeRef.current,
				iframe,
				isModal,
			);
			if (top <= 14 && isOut) {
				setIsOut(false);
			} else if (top > 14 && !isOut) {
				setIsOut(true);
			}
			resizeRef.current.style.cssText =
				generateCSS(left, top, width, height) + css;
			setPosition([resizeRef.current], isModal);
		}
	};
	const onResizeStart = useCallback(
		function (event: React.MouseEvent<HTMLSpanElement>, direction: Direction) {
			if (event.nativeEvent && iframe) {
				const { contentWindow } = iframe!;
				const {
					width,
					height,
					minWidth,
					minHeight,
					maxWidth,
					maxHeight,
				} = contentWindow!.getComputedStyle(selectNodeRef.current!);
				originSizeRef.current = {
					x: event.nativeEvent.clientX,
					y: event.nativeEvent.clientY,
					direction,
					width: formatUnit(width)!,
					height: formatUnit(height)!,
					minWidth: formatUnit(minWidth),
					minHeight: formatUnit(minHeight),
					maxWidth: formatUnit(maxWidth),
					maxHeight: formatUnit(maxHeight),
				};
				changeBaseboard();
			}
		},
		[
			iframe,
			selectNodeRef.current,
			resizeRef.current,
			baseboardRef.current,
			originSizeRef.current,
		],
	);

	const changeWidth = useCallback(() => {
		widthRef.current.contentEditable = 'true';
	}, [widthRef.current]);
	const changeHeight = useCallback(() => {
		heightRef.current.contentEditable = 'true';
	}, [heightRef.current]);

	/**
	 * 更新组件宽高
	 */
	const updateSize = useCallback(() => {
		const width = widthRef.current.innerHTML;
		const height = heightRef.current.innerHTML;
		resizeChange({ width, height });
		widthRef.current.contentEditable = 'false';
		heightRef.current.contentEditable = 'false';
	}, [widthRef.current, heightRef.current]);

	setSelectedBorder();

	return (
		<>
			<div className={styles['border-container']} ref={resizeRef}>
				<ActionSheet
					isOut={isOut}
					hasChildNodes={propName ? !!get(childNodes, propName) : !!childNodes}
					isRoot={selectedKey === ROOT}
				/>
				{map(Direction, (direction) => (
					<Item
						onResizeStart={onResizeStart}
						direction={direction}
						key={direction}
					/>
				))}
				<div
					className={hoverKey ? styles['tip-hidden'] : styles['size-tip-width']}
					ref={widthRef}
					onDoubleClick={updateSize}
					onClick={changeWidth}
				>
					{width}
				</div>
				<div
					className={
						hoverKey ? styles['tip-hidden'] : styles['size-tip-height']
					}
					ref={heightRef}
					onDoubleClick={updateSize}
					onClick={changeHeight}
				>
					{height}
				</div>
			</div>
			<div ref={baseboardRef} className={styles['baseboard']} />
		</>
	);
}

export default memo(Resize);
