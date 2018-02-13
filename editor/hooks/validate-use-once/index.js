/**
 * External dependencies
 */
import { find } from 'lodash';

/**
 * WordPress dependencies
 */
import { createBlock, getBlockType } from '@wordpress/blocks';
import { Button } from '@wordpress/components';
import { query } from '@wordpress/data';
import { getWrapperDisplayName } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Warning } from '../..';

const applyQuery = query( ( select, block ) => {
	const blocks = select( 'core/editor', 'getBlocks' );
	const { useOnce } = getBlockType( block.name );
	return {
		isValid: ! useOnce || isNotUsedBefore( block, blocks ),
	};
} );

function withUseOnceValidation( BlockEdit ) {
	const WrappedBlockEdit = ( { isValid, ...props } ) => {
		if ( isValid ) {
			return <BlockEdit { ...props } />;
		}

		const blockType = getBlockType( props.name );
		const outboundType = getOutboundType( blockType );

		return [
			<div key="invalid-preview" style={ { minHeight: '100px' } }>
				<BlockEdit key="block-edit" { ...props } />
			</div>,
			<Warning key="use-once-warning">
				<p>
					<strong>{ blockType.title }: </strong>
					{ __( 'This block may not be used more than once.' ) }</p>
				<p>
					<Button isLarge onClick={
						() => props.onReplace( [] )
					}>{ __( 'Remove' ) }</Button>
					{ outboundType &&
						<Button isLarge onClick={ () => props.onReplace(
							createBlock( outboundType.name, props.attributes )
						) }>
							{ __( 'Transform into:' ) }{ ' ' }
							{ outboundType.title }
						</Button>
					}
					{ props.name === 'core/more' ?
						<Button isLarge onClick={
							() => window.alert( 'Not implemented.' )
						}>
							{ __( 'Transform into:' ) }{ ' ' }
							{ /* Will be provided by actual Next Page block type */ }
							{ __( 'Next page' ) }
						</Button> :
						<Button isLarge onClick={
							() => props.onReplace(
								createBlock( 'core/html', props.attributes )
							)
						}>{ __( 'Edit as HTML' ) }</Button>
					}
				</p>
			</Warning>,
		];
	};

	WrappedBlockEdit.displayName = getWrapperDisplayName( BlockEdit, 'useOnceValidation' );

	return applyQuery( WrappedBlockEdit );
}

function isNotUsedBefore( { id, name }, blocks ) {
	for ( let i = 0; i < blocks.length; i++ ) {
		const block = blocks[ i ];

		// Only care blocks coming before `block`.
		if ( block.uid === id ) {
			return true;
		}

		// Invalid as soon as a previous block is of same type.
		if ( block.name === name ) {
			return false;
		}
	}

	return true;
}

function getOutboundType( blockType ) {
	// Grab the first outbound transform
	const { to = [] } = blockType.transforms || {};
	const transform = find( to, ( { type, blocks } ) =>
		type === 'block' && blocks.length === 1 // What about when .length > 1?
	);

	if ( ! transform ) {
		return null;
	}

	return getBlockType( transform.blocks[ 0 ] );
}

addFilter(
	'blocks.BlockEdit',
	'core/validation/useOnce',
	withUseOnceValidation
);
