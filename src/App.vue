<template>
  <!-- Экран входа (если пользователь не вошёл) -->
  <Auth v-if="!user" />

  <!-- Основное приложение (если пользователь вошёл) -->
  <div v-else class="min-h-screen bg-bgPrimary p-6">
    <!-- Приветствие и кнопка выхода -->
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-bold text-textPrimary">Привет, {{ userName }} 🐹</h1>
        <p class="text-sm text-textSecondary mt-1">Хорошего дня! Давай посмотрим на бюджет.</p>
      </div>
      <div class="flex gap-2">
        <button @click="showMenu = true" class="w-12 h-12 rounded-full bg-accentLilacLight flex items-center justify-center text-2xl">🐹</button>
        <button @click="logout" class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl" title="Выйти">🚪</button>
      </div>
    </div>

    <!-- Карточка с остатком и диаграммой -->
    <div class="bg-cardSurface rounded-[32px] p-6 shadow-lg mb-6">
      <h2 class="text-center text-textSecondary text-sm font-medium mb-4">Как делятся твои денежки</h2>
      <div class="h-56 flex items-center justify-center mb-6 relative">
        <Doughnut v-if="chartData.labels.length > 0" :data="chartData" :options="chartOptions" class="max-w-[220px]" />
        <div v-else class="text-center"><p class="text-textSecondary text-xs">Пока нет данных</p></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p class="text-textSecondary text-xs">Остаток</p>
          <p class="text-accentLilac text-2xl font-bold">{{ remaining }} ₽</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-accentLilacLight/50 rounded-2xl p-3 text-center">
          <p class="text-xs text-textSecondary mb-1">Доходы</p>
          <p class="text-lg font-bold text-incomeGreen">+{{ totalIncome }} ₽</p>
        </div>
        <div class="bg-accentLilacLight/50 rounded-2xl p-3 text-center">
          <p class="text-xs text-textSecondary mb-1">Расходы</p>
          <p class="text-lg font-bold text-accentLilac">-{{ totalExpenses }} ₽</p>
        </div>
      </div>
    </div>

    <!-- Список транзакций -->
    <div class="bg-cardSurface rounded-3xl p-5 mb-6">
      <h3 class="text-textPrimary font-bold text-lg mb-4">Последние операции</h3>
      <div v-if="transactions.length === 0" class="text-center py-8 text-textSecondary">Пока нет транзакций. Добавь первую!</div>
      <div v-else class="space-y-3">
        <div v-for="t in transactions" :key="t.id" class="flex items-center justify-between p-3 bg-bgPrimary rounded-2xl">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ getCategoryEmoji(t.categoryName) }}</span>
            <div>
              <p class="font-semibold text-textPrimary">{{ t.categoryName || 'Без категории' }}</p>
              <p class="text-xs text-textSecondary">{{ formatDate(t.date) }}</p>
              <p v-if="t.walletName" class="text-xs text-textSecondary">{{ t.walletName }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold" :class="t.type === 'income' ? 'text-incomeGreen' : 'text-accentLilac'">
              {{ t.type === 'income' ? '+' : '-' }}{{ t.amount }} ₽
            </span>
            <button @click="openEditModal(t)" class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-sm">✏️</button>
            <button @click="deleteTransaction(t.id)" class="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-sm">✕</button>
          </div>
        </div>
      </div>
    </div>

    <button @click="openAddModal" class="w-full bg-accentLilac text-white font-bold py-4 rounded-full shadow-lg shadow-accentLilac/40 flex items-center justify-center gap-2 text-lg">
      <span>+</span> Добавить транзакцию
    </button>

    <!-- ================= МОДАЛЬНЫЕ ОКНА ================= -->
    
    <!-- Модальное окно добавления/редактирования транзакции -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">{{ editingTransactionId ? 'Редактировать операцию' : 'Новая операция' }}</h3>
          <button @click="closeModal" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="flex gap-2 mb-6">
          <button @click="setType('expense')" :class="newType === 'expense' ? 'bg-accentLilac text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-1 py-3 rounded-2xl font-bold transition">Расход</button>
          <button @click="setType('income')" :class="newType === 'income' ? 'bg-incomeGreen text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-1 py-3 rounded-2xl font-bold transition">Доход</button>
        </div>
        <div class="mb-6">
          <label class="block text-sm text-textSecondary mb-1">{{ newType === 'expense' ? 'Сколько потратили?' : 'Сколько получили?' }}</label>
          <input v-model="newAmount" type="number" placeholder="0" class="w-full text-3xl font-bold text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac">
        </div>
        <div class="mb-6">
          <label class="block text-sm text-textSecondary mb-2">Кошелек</label>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button v-for="wallet in wallets.filter(w => !w.isArchived)" :key="wallet.id" @click="newWallet = wallet.name" :class="newWallet === wallet.name ? 'text-white' : 'text-textPrimary'" :style="{ backgroundColor: newWallet === wallet.name ? `#${wallet.colorHex}` : '#F7F4FA' }" class="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition min-w-[120px]">
              <span class="text-xl">{{ wallet.emoji }}</span><span class="text-sm">{{ wallet.name }}</span>
            </button>
          </div>
        </div>
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm text-textSecondary">Категория</label>
            <button @click="showAddCategory = true" class="text-sm font-medium text-accentLilac">+ Новая</button>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button v-for="cat in categories.filter(c => !c.isHidden)" :key="cat.id" @click="newCategory = cat.name" :class="newCategory === cat.name ? 'text-white' : 'text-textPrimary'" :style="{ backgroundColor: newCategory === cat.name ? `#${cat.colorHex}` : '#F7F4FA' }" class="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition min-w-[120px]">
              <span class="text-xl">{{ cat.emoji }}</span><span class="text-sm">{{ cat.name }}</span>
            </button>
          </div>
        </div>
        <button @click="saveTransaction" :disabled="!newAmount || newAmount <= 0 || !newWallet || !newCategory" class="w-full bg-accentLilac text-white font-bold py-4 rounded-2xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ editingTransactionId ? 'Сохранить изменения' : (newType === 'expense' ? 'Сохранить расход' : 'Сохранить доход') }}
        </button>
      </div>
    </div>

    <!-- Создание новой категории -->
    <div v-if="showAddCategory" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">Новая категория</h3>
          <button @click="showAddCategory = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div><label class="block text-sm text-textSecondary mb-1">Название</label><input v-model="newCategoryName" type="text" placeholder="Название" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac"></div>
          <div><label class="block text-sm text-textSecondary mb-2">Иконка:</label><div class="flex gap-3 overflow-x-auto pb-2"><button v-for="emoji in emojiOptions" :key="emoji" @click="newCategoryEmoji = emoji" :class="newCategoryEmoji === emoji ? 'bg-accentLilac text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition">{{ emoji }}</button></div></div>
          <div><label class="block text-sm text-textSecondary mb-2">Цвет:</label><div class="flex gap-3 overflow-x-auto pb-2"><button v-for="color in colorOptions" :key="color" @click="newCategoryColor = color" :class="newCategoryColor === color ? 'ring-2 ring-accentLilac ring-offset-2' : ''" :style="{ backgroundColor: `#${color}` }" class="flex-shrink-0 w-10 h-10 rounded-full transition"></button></div></div>
          <div class="flex gap-3 mt-6">
            <button @click="showAddCategory = false" class="flex-1 py-3 rounded-2xl font-medium bg-bgPrimary text-textPrimary">Отмена</button>
            <button @click="createCategory" :disabled="!newCategoryName" class="flex-1 py-3 rounded-2xl font-bold bg-accentLilac text-white disabled:opacity-50">Создать</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Экран Мечты (Цели) -->
    <div v-if="showGoals" class="fixed inset-0 bg-bgPrimary z-50 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-2xl font-bold text-textPrimary">Мои мечты ✨</h2>
          <button @click="showGoals = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div v-if="goals.length === 0" class="text-center py-12 text-textSecondary"><p class="text-4xl mb-4">🏖️</p><p>Пока нет целей. Самое время добавить первую!</p></div>
        <div v-else class="space-y-4">
          <div v-for="goal in goals.filter(g => !g.isArchived)" :key="goal.id" class="bg-cardSurface rounded-2xl p-5 shadow-lg">
            <div class="flex items-center gap-4 mb-4">
              <span class="text-3xl">{{ goal.emoji }}</span>
              <div class="flex-1">
                <p class="font-bold text-textPrimary text-lg">{{ goal.name }}</p>
                <p class="text-sm text-textSecondary"><span class="font-semibold" :style="{ color: `#${goal.colorHex}` }">{{ goal.currentAmount }} ₽</span> из {{ goal.targetAmount }} ₽</p>
              </div>
            </div>
            <div class="w-full bg-bgPrimary rounded-full h-3 mb-4 overflow-hidden">
              <div class="h-3 rounded-full transition-all duration-500" :style="{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%`, backgroundColor: `#${goal.colorHex}` }"></div>
            </div>
            <div class="flex gap-3">
              <button @click="openTopUpGoal(goal)" class="flex-1 py-3 rounded-xl font-bold bg-accentLilac text-white text-sm">Пополнить</button>
              <button @click="deleteGoal(goal.id)" class="w-12 py-3 rounded-xl font-bold bg-red-100 text-red-500 text-sm flex items-center justify-center"></button>
            </div>
          </div>
        </div>
        <button @click="showAddGoal = true" class="w-full bg-accentLilac text-white font-bold py-4 rounded-full mt-6 shadow-lg shadow-accentLilac/40">+ Добавить новую мечту</button>
      </div>
    </div>

    <!-- Пополнение цели -->
    <div v-if="showTopUpGoal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">Пополнить: {{ currentGoal?.name }}</h3>
          <button @click="showTopUpGoal = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="mb-6"><label class="block text-sm text-textSecondary mb-1">Сумма пополнения</label><input v-model="topUpAmount" type="number" placeholder="0" class="w-full text-3xl font-bold text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac"></div>
        <div class="mb-6">
          <label class="block text-sm text-textSecondary mb-2">Списать с кошелька:</label>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button v-for="wallet in wallets.filter(w => !w.isArchived)" :key="wallet.id" @click="topUpWallet = wallet.name" :class="topUpWallet === wallet.name ? 'text-white' : 'text-textPrimary'" :style="{ backgroundColor: topUpWallet === wallet.name ? `#${wallet.colorHex}` : '#F7F4FA' }" class="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition min-w-[120px]">
              <span class="text-xl">{{ wallet.emoji }}</span><span class="text-sm">{{ wallet.name }}</span>
            </button>
          </div>
        </div>
        <button @click="topUpGoal" :disabled="!topUpAmount || topUpAmount <= 0 || !topUpWallet" class="w-full bg-accentLilac text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">Пополнить и списать с кошелька</button>
      </div>
    </div>

    <!-- Создание новой цели -->
    <div v-if="showAddGoal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">Новая мечта</h3>
          <button @click="showAddGoal = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div><label class="block text-sm text-textSecondary mb-1">Название</label><input v-model="newGoalName" type="text" placeholder="Название" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac"></div>
          <div><label class="block text-sm text-textSecondary mb-1">Целевая сумма (₽)</label><input v-model="newGoalTarget" type="number" placeholder="0" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac"></div>
          <div><label class="block text-sm text-textSecondary mb-2">Иконка:</label><div class="flex gap-3 overflow-x-auto pb-2"><button v-for="emoji in emojiOptions" :key="emoji" @click="newGoalEmoji = emoji" :class="newGoalEmoji === emoji ? 'bg-accentLilac text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition">{{ emoji }}</button></div></div>
          <div><label class="block text-sm text-textSecondary mb-2">Цвет:</label><div class="flex gap-3 overflow-x-auto pb-2"><button v-for="color in colorOptions" :key="color" @click="newGoalColor = color" :class="newGoalColor === color ? 'ring-2 ring-accentLilac ring-offset-2' : ''" :style="{ backgroundColor: `#${color}` }" class="flex-shrink-0 w-10 h-10 rounded-full transition"></button></div></div>
          <div class="flex gap-3 mt-6">
            <button @click="showAddGoal = false" class="flex-1 py-3 rounded-2xl font-medium bg-bgPrimary text-textPrimary">Отмена</button>
            <button @click="createGoal" :disabled="!newGoalName || !newGoalTarget" class="flex-1 py-3 rounded-2xl font-bold bg-accentLilac text-white disabled:opacity-50">Создать</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Меню -->
    <div v-if="showMenu" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-3xl p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">Меню</h3>
          <button @click="showMenu = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="space-y-3">
          <button @click="showWallets = true; showMenu = false" class="w-full flex items-center gap-4 p-4 bg-bgPrimary rounded-2xl text-left">
            <span class="text-2xl">💳</span><div><p class="font-semibold text-textPrimary">Кошельки</p><p class="text-xs text-textSecondary">Управление картами и наличными</p></div>
          </button>
          <button @click="showGoals = true; showMenu = false" class="w-full flex items-center gap-4 p-4 bg-bgPrimary rounded-2xl text-left">
            <span class="text-2xl">✨</span><div><p class="font-semibold text-textPrimary">Мечты</p><p class="text-xs text-textSecondary">На что копишь</p></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Экран кошельков -->
    <div v-if="showWallets" class="fixed inset-0 bg-bgPrimary z-50 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-2xl font-bold text-textPrimary">Кошельки</h2>
          <button @click="showWallets = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div v-for="wallet in wallets.filter(w => !w.isArchived)" :key="wallet.id" class="bg-cardSurface rounded-2xl p-5 shadow-lg">
            <div class="flex items-center gap-4 mb-3">
              <span class="text-3xl">{{ wallet.emoji }}</span>
              <div><p class="font-bold text-textPrimary text-lg">{{ wallet.name }}</p><p class="text-xs text-textSecondary">Начальный: {{ wallet.initialBalance }} ₽</p></div>
            </div>
            <div class="flex justify-between items-center">
              <p class="text-textSecondary text-sm">Текущий баланс</p>
              <p class="text-2xl font-bold" :class="getWalletBalance(wallet.name) >= 0 ? 'text-accentLilac' : 'text-red-500'">{{ getWalletBalance(wallet.name) }} ₽</p>
            </div>
          </div>
        </div>
        <button @click="showAddWallet = true" class="w-full bg-accentLilac text-white font-bold py-4 rounded-full mt-6">+ Добавить кошелек</button>
      </div>
    </div>

    <!-- Создание кошелька -->
    <div v-if="showAddWallet" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">Новый кошелек</h3>
          <button @click="showAddWallet = false" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div><label class="block text-sm text-textSecondary mb-1">Название</label><input v-model="newWalletName" type="text" placeholder="Например, Копилка" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac"></div>
          <div><label class="block text-sm text-textSecondary mb-1">Начальный баланс</label><input v-model="newWalletBalance" type="number" placeholder="0" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac"></div>
          <div><label class="block text-sm text-textSecondary mb-2">Иконка:</label><div class="flex gap-3 overflow-x-auto pb-2"><button v-for="emoji in walletEmojiOptions" :key="emoji" @click="newWalletEmoji = emoji" :class="newWalletEmoji === emoji ? 'bg-accentLilac text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition">{{ emoji }}</button></div></div>
          <div class="flex gap-3 mt-6">
            <button @click="showAddWallet = false" class="flex-1 py-3 rounded-2xl font-medium bg-bgPrimary text-textPrimary">Отмена</button>
            <button @click="createWallet" :disabled="!newWalletName" class="flex-1 py-3 rounded-2xl font-bold bg-accentLilac text-white disabled:opacity-50">Создать</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { 
  collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, deleteDoc, query, orderBy, where 
} from 'firebase/firestore'
import { auth, db } from './firebase' 
import { signOut, onAuthStateChanged } from 'firebase/auth'
import Auth from './Auth.vue'

ChartJS.register(ArcElement, Tooltip, Legend)

const user = ref(null)
const userName = computed(() => user.value?.displayName || user.value?.email?.split('@')[0] || 'Пользователь')

// Состояние UI
const showAddModal = ref(false)
const showAddCategory = ref(false)
const showMenu = ref(false)
const showWallets = ref(false)
const showAddWallet = ref(false)
const showGoals = ref(false)
const showAddGoal = ref(false)
const showTopUpGoal = ref(false)
const editingTransactionId = ref(null)

const newAmount = ref('')
const newCategory = ref('Продукты')
const newWallet = ref('')
const newType = ref('expense')
const transactions = ref([])
const categories = ref([])
const wallets = ref([])
const goals = ref([])

const newCategoryName = ref('')
const newCategoryEmoji = ref('✨')
const newCategoryColor = ref('F4E1E6')

const newWalletName = ref('')
const newWalletBalance = ref('0')
const newWalletEmoji = ref('💳')

const newGoalName = ref('')
const newGoalTarget = ref('')
const newGoalEmoji = ref('✨')
const newGoalColor = ref('F4E1E6')
const currentGoal = ref(null)
const topUpAmount = ref('')
const topUpWallet = ref('')

const emojiOptions = ['🛒', '☕️', '🚗', '👗', '💰', '👦🏻', '🏠', '⛽️', '🍔', '🎙️', '🎮', '🏕️', '✈️', '💊', '💃', '🐾', '↔']
const walletEmojiOptions = ['🅰️', '💵', '', '💰', '👛', '💎']
const colorOptions = ['F4E1E6', 'fadadd', 'D9A8BA', 'C4B5D4', 'B8C8D8', 'A8C8C8', C8B8D4', 'B8D4E8', 'F4B896', 'F5E6E8', 'F5E6C8', 'E5EFE2', 'FADADD', 'C8D8E8', 'D4A8A8', 'F0E6D2', 'D4E8E0', 'A89888', '88C4C0', 'A8C8E0', 'A86878', '1E3A5F', '6B5868', 'B8A898', '4A88C0', 'F0B8C0']

function getCategoryEmoji(name) {
  const cat = categories.value.find(c => c.name === name)
  return cat?.emoji || '📦'
}

function formatDate(date) {
  if (!date) return 'только что'
  const d = date.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function getWalletBalance(walletName) {
  const wallet = wallets.value.find(w => w.name === walletName)
  if (!wallet) return 0
  const walletTransactions = transactions.value.filter(t => t.walletName === walletName)
  const income = walletTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expense = walletTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  return wallet.initialBalance + income - expense
}

const totalIncome = computed(() => transactions.value.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0))
const totalExpenses = computed(() => transactions.value.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))
const remaining = computed(() => Math.max(0, totalIncome.value - totalExpenses.value))

const chartData = computed(() => {
  const expenses = transactions.value.filter(t => t.type === 'expense')
  const grouped = {}
  expenses.forEach(t => { 
    const key = t.categoryName || 'Без категории'
    grouped[key] = (grouped[key] || 0) + t.amount 
  })
  const labels = Object.keys(grouped)
  const data = Object.values(grouped)
  const colors = labels.map(name => {
    const cat = categories.value.find(c => c.name === name)
    return cat ? `#${cat.colorHex}` : '#E0E0E0'
  })
  return { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] }
})

const chartOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '65%',
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#463E4D', titleFont: { family: 'system-ui', size: 14 }, bodyFont: { family: 'system-ui', size: 14 }, padding: 12, cornerRadius: 12, callbacks: { label: (context) => ` ${context.label}: ${context.raw} ₽` } }
  }
}

function setType(type) {
  newType.value = type
  newCategory.value = type === 'income' ? 'Зарплата' : 'Продукты'
}

function openAddModal() {
  editingTransactionId.value = null
  newAmount.value = ''
  newType.value = 'expense'
  newCategory.value = 'Продукты'
  newWallet.value = wallets.value.length > 0 ? wallets.value[0].name : ''
  showAddModal.value = true
}

function openEditModal(transaction) {
  editingTransactionId.value = transaction.id
  newAmount.value = transaction.amount
  newType.value = transaction.type
  newWallet.value = transaction.walletName || (wallets.value.length > 0 ? wallets.value[0].name : '')
  newCategory.value = transaction.categoryName || 'Продукты'
  showAddModal.value = true
}

function closeModal() {
  showAddModal.value = false
  editingTransactionId.value = null
}

function logout() {
  signOut(auth)
}

// ================= ЛОГИКА ЦЕЛЕЙ =================
function openTopUpGoal(goal) {
  currentGoal.value = goal
  topUpAmount.value = ''
  topUpWallet.value = wallets.value.length > 0 ? wallets.value[0].name : ''
  showTopUpGoal.value = true
}

const topUpGoal = async () => {
  if (!currentGoal.value || !topUpAmount.value || topUpAmount.value <= 0 || !topUpWallet.value || !user.value) return
  const amount = Number(topUpAmount.value)
  try {
    await updateDoc(doc(db, 'goals', currentGoal.value.id), { currentAmount: currentGoal.value.currentAmount + amount })
    await addDoc(collection(db, 'transactions'), {
      amount: amount, categoryName: `Мечта: ${currentGoal.value.name}`, walletName: topUpWallet.value, type: 'expense', userId: user.value.uid, date: serverTimestamp()
    })
    showTopUpGoal.value = false
    currentGoal.value = null
    topUpAmount.value = ''
  } catch (error) { console.error(' Ошибка пополнения:', error) }
}

const createGoal = async () => {
  if (!newGoalName.value || !newGoalTarget.value || !user.value) return
  try {
    await addDoc(collection(db, 'goals'), {
      name: newGoalName.value, targetAmount: Number(newGoalTarget.value), currentAmount: 0, emoji: newGoalEmoji.value, colorHex: newGoalColor.value, isArchived: false, userId: user.value.uid
    })
    newGoalName.value = ''; newGoalTarget.value = ''; newGoalEmoji.value = '✨'; newGoalColor.value = 'F4E1E6'; showAddGoal.value = false
  } catch (error) { console.error('❌ Ошибка создания цели:', error) }
}

const deleteGoal = async (id) => {
  if (!confirm('Удалить эту цель?')) return
  try { await deleteDoc(doc(db, 'goals', id)) } catch (error) { console.error('❌ Ошибка удаления цели:', error) }
}
// ================================================

// Отслеживание состояния авторизации
onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    
    if (currentUser) {
      const uid = currentUser.uid
      
      onSnapshot(query(collection(db, 'categories'), where('userId', '==', uid)), (snapshot) => {
        categories.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      })

      onSnapshot(query(collection(db, 'wallets'), where('userId', '==', uid)), (snapshot) => {
        wallets.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        if (wallets.value.length > 0 && !newWallet.value) newWallet.value = wallets.value[0].name
      })

      onSnapshot(query(collection(db, 'goals'), where('userId', '==', uid)), (snapshot) => {
        goals.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      })

      const q = query(collection(db, 'transactions'), where('userId', '==', uid))
      onSnapshot(q, (snapshot) => {
        transactions.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      })
    } else {
      transactions.value = []
      categories.value = []
      wallets.value = []
      goals.value = []
    }
  })
})

const saveTransaction = async () => {
  if (!newAmount.value || newAmount.value <= 0 || !newCategory.value || !newWallet.value || !user.value) return

  const transactionData = {
    amount: Number(newAmount.value),
    categoryName: newCategory.value,
    walletName: newWallet.value,
    type: newType.value,
    userId: user.value.uid,
    date: new Date()
  }

  try {
    if (editingTransactionId.value) {
      await updateDoc(doc(db, 'transactions', editingTransactionId.value), transactionData)
    } else {
      await addDoc(collection(db, 'transactions'), transactionData)
    }
    closeModal()
  } catch (error) { 
    console.error('Ошибка сохранения:', error)
    alert('Ошибка при сохранении: ' + error.message)
  }
}

const createCategory = async () => {
  if (!newCategoryName.value || !user.value) return
  try {
    await addDoc(collection(db, 'categories'), {
      name: newCategoryName.value, emoji: newCategoryEmoji.value, colorHex: newCategoryColor.value, limitPerPeriod: 0, isHidden: false, userId: user.value.uid
    })
    newCategory.value = newCategoryName.value; newCategoryName.value = ''; newCategoryEmoji.value = '✨'; newCategoryColor.value = 'F4E1E6'; showAddCategory.value = false
  } catch (error) { console.error('❌ Ошибка создания категории:', error) }
}

const createWallet = async () => {
  if (!newWalletName.value || !user.value) return
  try {
    await addDoc(collection(db, 'wallets'), {
      name: newWalletName.value, emoji: newWalletEmoji.value, colorHex: 'A594B6', initialBalance: Number(newWalletBalance.value) || 0, isArchived: false, userId: user.value.uid
    })
    newWalletName.value = ''; newWalletBalance.value = '0'; newWalletEmoji.value = '💳'; showAddWallet.value = false
  } catch (error) { console.error('❌ Ошибка создания кошелька:', error) }
}

const deleteTransaction = async (id) => {
  if (!confirm('Удалить эту транзакцию?')) return
  try { await deleteDoc(doc(db, 'transactions', id)) } catch (error) { console.error(' Ошибка удаления:', error) }
}
</script>