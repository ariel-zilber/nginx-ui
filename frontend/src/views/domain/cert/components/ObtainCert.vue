<script setup lang="ts">
import {useGettext} from 'vue3-gettext'
import {computed, inject, nextTick, provide, reactive, ref} from 'vue'
import websocket from '@/lib/websocket'
import Modal from 'ant-design-vue/lib/modal'
import {message} from 'ant-design-vue'
import template from '@/api/template'
import domain from '@/api/domain'
import AutoCertStepOne from '@/views/domain/cert/components/AutoCertStepOne.vue'

const {$gettext, interpolate} = useGettext()

const emit = defineEmits(['update:auto_cert'])

const modalVisible = ref(false)

const step = ref(1)

const progressStrokeColor = {
    from: '#108ee9',
    to: '#87d068'
}

const data: any = reactive({
    challenge_method: 'http01',
    code: '',
    configuration: {
        credentials: {},
        additional: {}
    }
})
const progressPercent = ref(0)
const progressStatus = ref('active')
const modalClosable = ref(true)
provide('data', data)

const logContainer = ref(null)

const save_site_config = inject('save_site_config')!
const no_server_name = inject('no_server_name')!
const props: any = inject('props')!
const issuing_cert = inject('issuing_cert')!

async function callback(ssl_certificate: string, ssl_certificate_key: string) {
    props.directivesMap['ssl_certificate'][0]['params'] = ssl_certificate
    props.directivesMap['ssl_certificate_key'][0]['params'] = ssl_certificate_key
    save_site_config()
}

function change_auto_cert(status: boolean) {
    if (status) {
        domain.add_auto_cert(props.config_name, {domains: name.value.trim().split(' '), ...data}).then(() => {
            message.success(interpolate($gettext('Auto-renewal enabled for %{name}'), {name: name.value}))
        }).catch(e => {
            message.error(e.message ?? interpolate($gettext('Enable auto-renewal failed for %{name}'), {name: name.value}))
        })
    } else {
        domain.remove_auto_cert(props.config_name).then(() => {
            message.success(interpolate($gettext('Auto-renewal disabled for %{name}'), {name: name.value}))
        }).catch(e => {
            message.error(e.message ?? interpolate($gettext('Disable auto-renewal failed for %{name}'), {name: name.value}))
        })
    }
}

async function onchange(r: boolean) {
    if (r) {
        await template.get_block('letsencrypt.conf').then(r => {
            props.ngx_config.servers.forEach(async (v: any) => {
                v.locations = v.locations.filter((l: any) => l.path !== '/.well-known/acme-challenge')

                v.locations.push(...r.locations)
            })
        }).then(async () => {
            // if ssl_certificate is empty, do not save, just use the config from last step.
            if (props.directivesMap['ssl_certificate']?.[0]) {
                await save_site_config()
            }
            job()
        })
    } else {
        await props.ngx_config.servers.forEach((v: any) => {
            v.locations = v.locations.filter((l: any) => l.path !== '/.well-known/acme-challenge')
        })
        save_site_config()
        change_auto_cert(r)
    }

    emit('update:auto_cert', r)
}

function job() {
    modalClosable.value = false
    issuing_cert.value = true

    if (no_server_name.value) {
        message.error($gettext('server_name not found in directives'))
        issuing_cert.value = false
        return
    }

    const server_name = props.directivesMap['server_name'][0]

    if (!props.directivesMap['ssl_certificate']) {
        props.current_server_directives.splice(server_name.idx + 1, 0, {
            directive: 'ssl_certificate',
            params: ''
        })
    }

    nextTick(() => {
        if (!props.directivesMap['ssl_certificate_key']) {
            const ssl_certificate = props.directivesMap['ssl_certificate'][0]
            props.current_server_directives.splice(ssl_certificate.idx + 1, 0, {
                directive: 'ssl_certificate_key',
                params: ''
            })
        }
    }).then(() => {
        issue_cert(props.config_name, name.value, callback)
    })
}

function log(msg: string) {
    const para = document.createElement('p')
    para.appendChild(document.createTextNode($gettext(msg)));

    (logContainer.value as any as Node).appendChild(para);

    (logContainer.value as any as Element).scroll({top: 100000, left: 0, behavior: 'smooth'})
}

const issue_cert = async (config_name: string, server_name: string, callback: Function) => {
    progressStatus.value = 'active'
    modalClosable.value = false
    modalVisible.value = true
    progressPercent.value = 0;
    (logContainer.value as any as Element).innerHTML = ''

    log($gettext('Getting the certificate, please wait...'))

    const ws = websocket(`/api/domain/${config_name}/cert`, false)

    ws.onopen = () => {
        ws.send(JSON.stringify({
            server_name: server_name.trim().split(' '),
            ...data
        }))
    }

    ws.onmessage = m => {
        const r = JSON.parse(m.data)
        log(r.message)

        switch (r.status) {
            case 'info':
                // If it's a lego log, do not increase the percent.
                if (r.message.indexOf('[INFO]') == -1) {
                    progressPercent.value += 5
                }
                break
            default:
                modalClosable.value = true
                issuing_cert.value = false

                if (r.status === 'success' && r.ssl_certificate !== undefined && r.ssl_certificate_key !== undefined) {
                    progressStatus.value = 'success'
                    progressPercent.value = 100
                    callback(r.ssl_certificate, r.ssl_certificate_key)
                    change_auto_cert(true)
                } else {
                    progressStatus.value = 'exception'
                }
                break
        }
    }
}

const name = computed(() => {
    return props.directivesMap['server_name'][0].params.trim()
})


function toggle(status: boolean) {
    if (status) {
        Modal.confirm({
            title: $gettext('Do you want to disable auto-cert renewal?'),
            content: $gettext('We will remove the HTTPChallenge configuration from ' +
                'this file and reload the Nginx. Are you sure you want to continue?'),
            okText: $gettext('OK'),
            cancelText: $gettext('Cancel'),
            mask: false,
            centered: true,
            onOk: () => onchange(false)
        })
    } else {
        modalVisible.value = true
        modalClosable.value = true
    }
}

defineExpose({
    toggle
})

const can_next = computed(() => {
    if (step.value === 2) {
        return false
    } else {
        if (data.challenge_method === 'http01') {
            return true
        } else if (data.challenge_method === 'dns01') {
            return data?.code ?? false
        }
    }
})

function next() {
    step.value++
    onchange(true)
}
</script>

<template>
    <a-modal
        :title="$gettext('Obtain certificate')"
        v-model:visible="modalVisible"
        :mask-closable="modalClosable"
        :footer="null" :closable="modalClosable" force-render>
        <template v-if="step===1">
            <auto-cert-step-one/>
        </template>
        <template v-else-if="step===2">
            <a-progress
                :stroke-color="progressStrokeColor"
                :percent="progressPercent"
                :status="progressStatus"
            />

            <div class="issue-cert-log-container" ref="logContainer"/>
        </template>
        <div class="control-btn" v-if="can_next">
            <a-button type="primary" @click="next">
                {{ $gettext('Next') }}
            </a-button>
        </div>
    </a-modal>
</template>

<style lang="less" scoped>
.control-btn {
    display: flex;
    justify-content: flex-end;
}
</style>
