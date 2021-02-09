import React,{createElement} from 'react'
import styles from './index.less'
import { useSelector } from '@brickd/react'
import BrickRender from '@brickd/render'

export default function PreviewPanel() {
	const { platformInfo,pageConfig } = useSelector(['platformInfo','pageConfig'])
	const { size } = platformInfo

	const style = { width: size[0], maxHeight: size[1], transition: 'all 700ms' }

	return (
		<div
			style={style}
			className={`${styles['browser-mockup']} ${styles['with-url']}`}
		>
			<BrickRender pageConfig={pageConfig} createElement={createElement}/>
		</div>
	)
}
