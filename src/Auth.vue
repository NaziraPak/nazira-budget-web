<template>
  <div class="min-h-screen bg-bgPrimary flex items-center justify-center p-6">
    <div v-if="showNameModal" class="bg-cardSurface w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <h3 class="text-xl font-bold text-textPrimary mb-4">Как вас зовут?</h3>
      <p class="text-sm text-textSecondary mb-4">Это имя будет отображаться в приложении</p>
      <div v-if="errorMessage" class="bg-red-100 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
        {{ errorMessage }}
      </div>
      <input
        v-model="userName"
        type="text"
        placeholder="Ваше имя"
        class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac mb-4"
        @keyup.enter="saveUserName"
      >
      <button
        @click="saveUserName"
        :disabled="!userName.trim()"
        class="w-full bg-accentLilac text-white font-bold py-4 rounded-2xl disabled:opacity-50"
      >
        Продолжить
      </button>
    </div>

    <div v-else class="bg-cardSurface w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-textPrimary mb-2">Учёт финансов 🐹</h1>
        <p class="text-textSecondary">Войдите, чтобы управлять бюджетом</p>
      </div>

      <div v-if="errorMessage" class="bg-red-100 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
        {{ errorMessage }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-textSecondary mb-1">Email</label>
          <input v-model="email" type="email" placeholder="your@email.com" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac">
        </div>
        <div>
          <label class="block text-sm text-textSecondary mb-1">Пароль</label>
          <input v-model="password" type="password" placeholder="Минимум 6 символов" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac">
        </div>

        <button @click="handleEmailAuth('login')" class="w-full bg-accentLilac text-white font-bold py-4 rounded-2xl mt-2">Войти</button>
        <button @click="handleEmailAuth('register')" class="w-full bg-bgPrimary text-textPrimary font-bold py-4 rounded-2xl border-2 border-accentLilac/20">Зарегистрироваться</button>
        
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
          <div class="relative flex justify-center text-sm"><span class="px-2 bg-cardSurface text-textSecondary">или</span></div>
        </div>

        <button @click="handleGoogleAuth" class="w-full bg-white text-textPrimary font-bold py-4 rounded-2xl border-2 border-gray-200 flex items-center justify-center gap-3 hover:bg-gray-50 transition">
          <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Войти через Google
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
        <div class="w-6 h-6 border-4 border-accentLilac border-t-transparent rounded-full animate-spin"></div>
        <span class="text-textPrimary font-medium">Загрузка...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from './firebase'

const props = defineProps({
  askName: { type: Boolean, default: false }
})
const emit = defineEmits(['profile-updated'])

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const showNameModal = ref(false)
const userName = ref('')
const pendingUser = ref(null)

const POPUP_FALLBACK_CODES = ['auth/popup-blocked', 'auth/cancelled-popup-request']

function askForNameIfNeeded(firebaseUser) {
  if (!firebaseUser) return
  const existingName = firebaseUser?.displayName
  if (existingName) {
    emit('profile-updated', existingName)
    return
  }
  pendingUser.value = firebaseUser
  showNameModal.value = true
}

watch(
  () => props.askName,
  (needName) => {
    if (needName) askForNameIfNeeded(auth.currentUser)
  },
  { immediate: true }
)

onAuthStateChanged(auth, (firebaseUser) => {
  askForNameIfNeeded(firebaseUser)
})

const handleEmailAuth = async (action) => {
  const trimmedEmail = email.value.trim()
  errorMessage.value = ''

  if (!trimmedEmail || !password.value) {
    errorMessage.value = 'Введите email и пароль'
    return
  }
  if (password.value.length < 6) {
    errorMessage.value = 'Пароль должен быть не менее 6 символов'
    return
  }

  isLoading.value = true
  try {
    if (action === 'login') {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password.value)
      askForNameIfNeeded(userCredential.user)
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password.value)
      askForNameIfNeeded(userCredential.user)
    }
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error.code)
  } finally {
    isLoading.value = false
  }
}

const handleGoogleAuth = async () => {
  errorMessage.value = ''
  isLoading.value = true
  const provider = new GoogleAuthProvider()
  let redirected = false

  try {
    try {
      const credential = await signInWithPopup(auth, provider)
      askForNameIfNeeded(credential.user)
    } catch (popupError) {
      if (!POPUP_FALLBACK_CODES.includes(popupError.code)) {
        throw popupError
      }
      redirected = true
      await signInWithRedirect(auth, provider)
    }
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error.code)
  } finally {
    if (!redirected) isLoading.value = false
  }
}

const saveUserName = async () => {
  const name = userName.value.trim()
  if (!name || !pendingUser.value) return
  isLoading.value = true
  try {
    await updateProfile(pendingUser.value, { displayName: name })
    await pendingUser.value.reload()
    emit('profile-updated', name)
    showNameModal.value = false
    pendingUser.value = null
    userName.value = ''
  } catch (error) {
    errorMessage.value = 'Ошибка при сохранении имени'
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email': return 'Неверный формат email'
    case 'auth/user-disabled': return 'Этот аккаунт отключен'
    case 'auth/user-not-found': return 'Пользователь не найден. Проверьте email или зарегистрируйтесь.'
    case 'auth/wrong-password': return 'Неверный пароль'
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials': return 'Неверный email или пароль'
    case 'auth/email-already-in-use': return 'Этот email уже зарегистрирован. Нажмите «Войти» или войдите через Google — тот способ, которым регистрировались.'
    case 'auth/account-exists-with-different-credential': return 'Этот email уже используется с другим способом входа. Войдите через email и пароль или через Google — как регистрировались.'
    case 'auth/weak-password': return 'Пароль должен быть не менее 6 символов'
    case 'auth/too-many-requests': return 'Слишком много попыток. Подождите немного и попробуйте снова.'
    case 'auth/network-request-failed': return 'Нет соединения. Проверьте интернет и попробуйте снова.'
    case 'auth/popup-closed-by-user': return 'Окно входа было закрыто'
    case 'auth/popup-blocked': return 'Браузер заблокировал окно входа. Разрешите всплывающие окна и попробуйте снова.'
    default: return 'Произошла ошибка. Проверьте данные и попробуйте снова.'
  }
}

onMounted(async () => {
  try {
    const result = await getRedirectResult(auth)
    if (result) {
      askForNameIfNeeded(result.user)
      return
    }
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error.code)
  }

  askForNameIfNeeded(auth.currentUser)
})
</script>
