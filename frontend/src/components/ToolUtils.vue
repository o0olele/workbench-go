<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Copy, RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { ClipboardSetText } from '../../wailsjs/runtime/runtime'

const { t } = useI18n()

// --- Timestamp Converter ---
const timestampInput = ref<string>('')
const dateInput = ref<string>('')
const currentTimestamp = ref<number>(Math.floor(Date.now() / 1000))
let timer: number | null = null

const updateCurrentTimestamp = () => {
  currentTimestamp.value = Math.floor(Date.now() / 1000)
}

onMounted(() => {
  updateCurrentTimestamp()
  timer = window.setInterval(updateCurrentTimestamp, 1000)
  // Initialize inputs with current time
  timestampInput.value = currentTimestamp.value.toString()
  dateInput.value = formatDate(new Date())
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const formatDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const convertTimestampToDate = () => {
  const ts = parseInt(timestampInput.value)
  if (!isNaN(ts)) {
    dateInput.value = formatDate(new Date(ts * 1000))
  }
}

const convertDateToTimestamp = () => {
  const date = new Date(dateInput.value)
  if (!isNaN(date.getTime())) {
    timestampInput.value = Math.floor(date.getTime() / 1000).toString()
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await ClipboardSetText(text)
    toast(t('common.copied'), {
      description: t('tool_utils.copied_desc'),
    })
    console.log('Copied to clipboard: ', text)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

// --- Password Generator ---
const passwordLength = ref<number>(16)
const passwordLengthModel = computed({
  get: () => [passwordLength.value],
  set: (val) => { passwordLength.value = val[0] }
})
const includeUppercase = ref<boolean>(true)
const includeLowercase = ref<boolean>(true)
const includeNumbers = ref<boolean>(true)
const includeSymbols = ref<boolean>(true)
const customSymbols = ref<string>('!@#$%^&*()_+~`|}{[]:;?><,./-=')
const generatedPassword = ref<string>('')

const generatePassword = () => {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz'
  const numberChars = '0123456789'
  
  let chars = ''
  if (includeUppercase.value) chars += uppercaseChars
  if (includeLowercase.value) chars += lowercaseChars
  if (includeNumbers.value) chars += numberChars
  if (includeSymbols.value) chars += customSymbols.value

  if (chars === '') {
    generatedPassword.value = ''
    return
  }

  let password = ''
  for (let i = 0; i < passwordLength.value; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    password += chars[randomIndex]
  }
  generatedPassword.value = password
}

// Watch for changes to regenerate password
watch([passwordLength, includeUppercase, includeLowercase, includeNumbers, includeSymbols, customSymbols], () => {
  generatePassword()
})

// Generate initial password
onMounted(() => {
  generatePassword()
})

</script>

<template>
  <div class="h-full w-full p-6 overflow-auto bg-background text-foreground">
    <div class="max-w-4xl mx-auto space-y-8">
      
      <!-- Timestamp Converter -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            {{ t('tool_utils.timestamp_converter') }}
            <span class="text-sm font-normal text-muted-foreground ml-auto">
              {{ t('tool_utils.current_time') }}: {{ currentTimestamp }}
            </span>
          </CardTitle>
          <CardDescription>{{ t('tool_utils.timestamp_desc') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <div class="space-y-2">
              <Label>{{ t('tool_utils.timestamp') }} ({{ t('tool_utils.seconds') }})</Label>
              <div class="flex gap-2">
                <Input v-model="timestampInput" placeholder="1678888888" @input="convertTimestampToDate" />
                <Button variant="outline" size="icon" @click="copyToClipboard(timestampInput)">
                  <Copy class="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div class="flex justify-center pb-2">
              <RefreshCw class="w-4 h-4 text-muted-foreground" />
            </div>

            <div class="space-y-2">
              <Label>{{ t('tool_utils.datetime') }}</Label>
              <div class="flex gap-2">
                <Input v-model="dateInput" placeholder="YYYY-MM-DD HH:mm:ss" @input="convertDateToTimestamp" />
                <Button variant="outline" size="icon" @click="copyToClipboard(dateInput)">
                  <Copy class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Password Generator -->
      <Card>
        <CardHeader>
          <CardTitle>{{ t('tool_utils.password_generator') }}</CardTitle>
          <CardDescription>{{ t('tool_utils.password_desc') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Generated Password Display -->
          <div class="flex gap-2">
            <div class="flex-1 p-3 bg-muted rounded-md font-mono text-lg break-all flex items-center min-h-[3rem]">
              {{ generatedPassword }}
            </div>
            <Button variant="outline" size="icon" class="h-auto" @click="copyToClipboard(generatedPassword)" :title="t('common.copy')">
              <Copy class="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon" class="h-auto" @click="generatePassword" :title="t('common.refresh')">
              <RefreshCw class="w-4 h-4" />
            </Button>
          </div>

          <!-- Controls -->
          <div class="grid gap-6">
            <div class="space-y-4">
              <div class="flex justify-between">
                <Label>{{ t('tool_utils.password_length') }}: {{ passwordLength }}</Label>
              </div>
              <Slider
                v-model="passwordLengthModel"
                :min="6"
                :max="64"
                :step="1"
                class="w-full"
              />
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="flex items-center space-x-2">
                <Switch id="uppercase" v-model="includeUppercase" />
                <Label for="uppercase">A-Z</Label>
              </div>
              <div class="flex items-center space-x-2">
                <Switch id="lowercase" v-model="includeLowercase" />
                <Label for="lowercase">a-z</Label>
              </div>
              <div class="flex items-center space-x-2">
                <Switch id="numbers" v-model="includeNumbers" />
                <Label for="numbers">0-9</Label>
              </div>
              <div class="flex items-center space-x-2">
                <Switch id="symbols" v-model:checked="includeSymbols" />
                <Label for="symbols">!@#</Label>
              </div>
            </div>

            <!-- Custom Symbols Input -->
            <div v-if="includeSymbols" class="space-y-2">
              <Label>{{ t('tool_utils.custom_symbols') }}</Label>
              <Input v-model="customSymbols" :placeholder="t('tool_utils.custom_symbols_placeholder')" />
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  </div>
</template>
