import { useContext } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { List, ListCreateParams } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import OptionField from '../../ui/form/OptionField'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'
import RuleBuilder, { createWrapperRule } from './RuleBuilder'

interface ListCreateFormProps {
    onCreated?: (list: List) => void
    isJourneyList?: boolean
}

export function ListCreateForm({ onCreated, isJourneyList = false }: ListCreateFormProps) {
    const [project] = useContext(ProjectContext)
    const defaults: Partial<ListCreateParams> = {
        type: 'dynamic',
        rule: createWrapperRule(),
    }

    return (
        <FormWrapper<ListCreateParams>
            onSubmit={
                async list => {
                    const created = await api.lists.create(project.id, {
                        ...list,
                        rule: list.type === 'dynamic' ? createWrapperRule() : undefined,
                        is_visible: true,
                    })
                    onCreated?.(created)
                }
            }
            defaultValues={defaults}
            submitLabel="Save"
        >
            {form => (
                <>
                    <TextInput.Field
                        form={form}
                        name="name"
                        label="List Name"
                        required
                    />
                    {!isJourneyList && <>
                        <OptionField
                            form={form}
                            name="type"
                            label="Type"
                            options={[
                                { key: 'dynamic', label: 'Dynamic' },
                                { key: 'static', label: 'Static' },
                            ]}
                        />
                        <TagPicker.Field
                            form={form}
                            name="tags"
                        />
                    </>}
                    {isJourneyList && <RuleBuilder.Field
                        form={form}
                        name="rule"
                        required
                    />}
                </>
            )}
        </FormWrapper>
    )
}
