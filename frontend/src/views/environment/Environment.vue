<script setup lang="tsx">
import {useGettext} from 'vue3-gettext'
import {customRender, datetime} from '@/components/StdDataDisplay/StdTableTransformer'
import environment from '@/api/environment'
import StdCurd from '@/components/StdDataDisplay/StdCurd.vue'
import {input, antSwitch, textarea} from '@/components/StdDataEntry'
import {h} from 'vue'
import {Badge, Tag} from 'ant-design-vue'

const {$gettext, interpolate} = useGettext()

const columns = [{
    title: () => $gettext('Name'),
    dataIndex: 'name',
    sorter: true,
    pithy: true,
    edit: {
        type: input
    }
}, {
    title: () => $gettext('URL'),
    dataIndex: 'url',
    sorter: true,
    pithy: true,
    edit: {
        type: input,
        placeholder: () => 'https://10.0.0.1:9000'
    }
}, {
    title: () => 'NodeSecret',
    dataIndex: 'token',
    sorter: true,
    display: false,
    edit: {
        type: input
    }
}, {
    title: () => $gettext('OperationSync'),
    dataIndex: 'operation_sync',
    sorter: true,
    pithy: true,
    edit: {
        type: antSwitch
    },
    extra: $gettext('Whether config api regex that will redo on this environment'),
    customRender: (args: customRender) => {
        const {operation_sync} = args.record
        if (operation_sync) {
            return h(Tag, {color: 'success'}, {default: ()=> h('span', '是')})
        } else {
            return h(Tag, {color: 'default'}, {default: ()=> h('span', '否')})
        }
    },
}, {
    title: () => $gettext('SyncApiRegex'),
    dataIndex: 'sync_api_regex',
    sorter: true,
    pithy: true,
    display: false,
    edit: {
      type: textarea,
      show: (data) => {
        const {operation_sync} = data
        return operation_sync
      }
    },
    extra: $gettext('Such as Reload and Configs, regex can configure as `/api/nginx/reload|/api/nginx/test|/api/config/.+`, please see system api'),
}, {
    title: () => $gettext('Status'),
    dataIndex: 'status',
    customRender: (args: customRender) => {
        const template: any = []
        const {text} = args
        if (text === true || text > 0) {
            template.push(<Badge status="success"/>)
            template.push($gettext('Online'))
        } else {
            template.push(<Badge status="error"/>)
            template.push($gettext('Offline'))
        }
        return h('div', template)
    },
    sorter: true,
    pithy: true
}, {
    title: () => $gettext('Updated at'),
    dataIndex: 'updated_at',
    customRender: datetime,
    sorter: true,
    pithy: true
}, {
    title: () => $gettext('Action'),
    dataIndex: 'action'
}]

</script>

<template>
    <std-curd :title="$gettext('Environment')" :api="environment" :columns="columns"/>
</template>

<style lang="less" scoped>

</style>
