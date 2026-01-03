<script lang="ts">
    import { settings } from '../../settings-store.svelte'
    import {
        Checkbox,
        FormGroup,
        RadioGroup,
        NumberInput,
        InlineGroup,
        RadioButton,
    } from '../ui'
    import LinkEditor from './LinkEditor.svelte'
</script>

<FormGroup>
    <Checkbox bind:checked={settings.showLinks}>enabled</Checkbox>
</FormGroup>

{#if settings.showLinks}
    <InlineGroup>
        <FormGroup label="open in">
            <RadioGroup>
                <RadioButton bind:group={settings.linkTarget} value="_self">
                    same tab
                </RadioButton>
                <RadioButton bind:group={settings.linkTarget} value="_blank">
                    new tab
                </RadioButton>
            </RadioGroup>
        </FormGroup>
        <FormGroup label="per column" autoWidth>
            <NumberInput
                bind:value={settings.linksPerColumn}
                id="linksPerColumn"
                step="1"
            />
        </FormGroup>
    </InlineGroup>

    <FormGroup>
        <Checkbox bind:checked={settings.showFavicons}>show favicons</Checkbox>
    </FormGroup>

    <LinkEditor bind:links={settings.links} />
{/if}
