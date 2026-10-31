<template>
  <!-- Экран входа -->
  <Auth v-if="!user" />

  <!-- Основное приложение -->
  <div v-else class="min-h-screen bg-bgPrimary p-6">
    <!-- Приветствие -->
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

    <!-- Группировка по категориям -->
    <div class="bg-cardSurface rounded-3xl p-5 mb-6">
      <h3 class="text-textPrimary font-bold text-lg mb-4">Расходы по категориям ({{ monthName }})</h3>
      
      <div v-if="groupedTransactions.length === 0" class="text-center py-8 text-textSecondary">В этом месяце пока нет расходов по категориям.</div>
      
      <div v-else class="space-y-4">
        <div v-for="cat in groupedTransactions" :key="cat.name" class="bg-bgPrimary rounded-2xl p-4">
          <div @click="toggleCat(cat.name)" class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-3 flex-1">
              <span class="text-2xl">{{ cat.emoji }}</span>
              <div class="flex-1">
                <p class="font-semibold text-textPrimary">{{ cat.name }}</p>
                <p class="text-xs text-textSecondary">Транзакций: {{ cat.items.length }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-accentLilac">{{ cat.total }} ₽</p>
              <p class="text-xs text-textSecondary">{{ expandedCats.includes(cat.name) ? 'Свернуть ▲' : 'Развернуть ▼' }}</p>
            </div>
          </div>

          <!-- Прогресс-бар плана -->
          <div v-if="cat.planned > 0" class="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
            <div class="h-2 rounded-full transition-all duration-500" :class="cat.total > cat.planned ? 'bg-red-500' : 'bg-accentLilac'" :style="{ width: Math.min(100, (cat.total / cat.planned) * 100) + '%' }"></div>
          </div>
          <div v-if="cat.planned > 0" class="flex justify-between text-xs text-textSecondary mt-1">
            <span>План: {{ cat.planned }} ₽</span>
            <span :class="cat.planned - cat.total < 0 ? 'text-red-500' : 'text-incomeGreen'">Осталось: {{ cat.planned - cat.total }} ₽</span>
          </div>

          <!-- Раскрывающийся список -->
          <div v-if="expandedCats.includes(cat.name)" class="mt-4 space-y-2 border-t border-gray-100 pt-3">
            <div v-for="t in cat.items" :key="t.id" class="flex justify-between items-center text-sm">
              <div>
                <p class="text-textPrimary">{{ t.comment || 'Без комментария' }}</p>
                <p class="text-xs text-textSecondary">{{ formatDate(t.date) }} • {{ t.walletName }}</p>
              </div>
              <p class="font-bold text-accentLilac">-{{ t.amount }} ₽</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button @click="openAddModal" class="w-full bg-accentLilac text-white font-bold py-4 rounded-full shadow-lg shadow-accentLilac/40 flex items-center justify-center gap-2 text-lg">
      <span>+</span> Добавить операцию
    </button>

    <!-- ================= МОДАЛЬНЫЕ ОКНА ================= -->
    
    <!-- Добавление/редактирование операции -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div class="bg-cardSurface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-textPrimary">{{ editingTransactionId ? 'Редактировать' : 'Новая операция' }}</h3>
          <button @click="closeModal" class="text-textSecondary text-2xl">&times;</button>
        </div>
        <div class="flex gap-2 mb-6">
          <button @click="setType('expense')" :class="newType === 'expense' ? 'bg-accentLilac text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-1 py-3 rounded-2xl font-bold transition">Расход</button>
          <button @click="setType('income')" :class="newType === 'income' ? 'bg-incomeGreen text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-1 py-3 rounded-2xl font-bold transition">Доход</button>
          <button @click="setType('transfer')" :class="newType === 'transfer' ? 'bg-blue-400 text-white' : 'bg-bgPrimary text-textPrimary'" class="flex-1 py-3 rounded-2xl font-bold transition">Перевод</button>
        </div>
        <div class="mb-6">
          <label class="block text-sm text-textSecondary mb-1">{{ newType === 'expense' ? 'Сколько потратили?' : 'Сколько получили?' }}</label>
          <input v-model="newAmount" type="number" placeholder="0" class="w-full text-3xl font-bold text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac">
        </div>
        
        <div v-if="newType !== 'transfer'" class="mb-6">
          <label class="block text-sm text-textSecondary mb-2">Кошелек</label>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button v-for="wallet in wallets.filter(w => !w.isArchived)" :key="wallet.id" @click="newWallet = wallet.name" :class="newWallet === wallet.name ? 'text-white' : 'text-textPrimary'" :style="{ backgroundColor: newWallet === wallet.name ? `#${wallet.colorHex}` : '#F7F4FA' }" class="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition min-w-[120px]">
              <span class="text-xl">{{ wallet.emoji }}</span><span class="text-sm">{{ wallet.name }}</span>
            </button>
          </div>
        </div>

        <div v-if="newType !== 'transfer'" class="mb-6">
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

        <div class="mb-6">
          <label class="block text-sm text-textSecondary mb-1">Комментарий (необязательно)</label>
          <input v-model="newComment" type="text" placeholder="Например: обед с коллегами" class="w-full text-base text-textPrimary bg-bgPrimary rounded-2xl p-4 outline-none focus:ring-2 focus:ring-accentLilac">
        </div>

        <div v-if="newType === 'transfer'" class="space-y-4 mb-6">
          <div>
            <label class="block text-sm text-textSecondary mb-2">Откуда</label>
            <div class="flex gap-3 overflow-x-auto pb-2">
              <button v-for="wallet in wallets.filter(w => !w.isArchived)" :key="wallet.id" @click="transferFrom = wallet.name" :class="transferFrom === wallet.name ? 'text-white' : 'text-textPrimary'" :style="{ backgroundColor: transferFrom === wallet.name ? `#${wallet.colorHex}` : '#F7F4FA' }" class="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition min-w-[120px]">
                <span class="text-xl">{{ wallet.emoji }}</span><span class="text-sm">{{ wallet.name }}</span>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm text-textSecondary mb-2">Куда</label>
            <div class="flex gap-3 overflow-x-auto pb-2">
              <button v-for="wallet in wallets.filter(w => !w.isArchived && w.name !== transferFrom)" :key="wallet.id" @click="transferTo = wallet.name" :class="transferTo === wallet.name ? 'text-white' : 'text-textPrimary'" :style="{ backgroundColor: transferTo === wallet.name ? `#${wallet.colorHex}` : '#F7F4FA' }" class="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition min-w-[120px]">
                <span class="text-xl">{{ wallet.emoji }}</span><span class="text-sm">{{ wallet.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <button @click="saveTransaction" :disabled="!newAmount || newAmount <= 0 || (newType !== 'transfer' && (!newWallet || !newCategory)) || (newType === 'transfer' && (!transferFrom || !transferTo || transferFrom === transferTo))" class="w-full bg-accentLilac text-white font-bold py-4 rounded-2xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ editingTransactionId ? 'Сохранить' : (newType === 'expense' ? 'Сохранить расход' : newType === 'income' ? 'Сохранить доход' : 'Перевести') }}
        </button>
      </div>
    </div>

    <!-- Новая категория -->
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

    <!-- Мечты (Цели) -->
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
              <button @click="deleteGoal(goal.id)" class="w-12 py-3 rounded-xl font-bold bg-red-100 text-red-500 text-sm flex items-center justify-center">🗑️</button>
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
        <button @click="topUpGoal" :disabled="!topUpAmount || topUpAmount <= 0 || !topUpWallet" class="w-full bg-accentLilac text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">Пополнить и списать</button>
      </div>
    </div>

    <!-- Новая цель -->
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
          <button @click="showBudgetModal = true; showMenu = false" class="w-full flex items-center gap-4 p-4 bg-bgPrimary rounded-2xl text-left">
            <span class="text-2xl">📊</span><div><p class="font-semibold text-textPrimary">Планирование</p><p class="text-xs text-textSecondary">Бюджет по категориям</p></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Кошельки -->
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
          <div class="flex items-center gap-3 mt-4 p-3 bg-bgPrimary rounded-2xl">
            <input type="checkbox" id="includeInTotal" v-model="includeInTotal" class="w-5 h-5 rounded border-gray-300 text-accentLilac focus:ring-accentLilac">
            <label for="includeInTotal" class="text-sm text-textPrimary cursor-pointer select-none">Учитывать в общем балансе (остатке)</label>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showAddWallet = false" class="flex-1 py-3 rounded-2xl font-medium bg-bgPrimary text-textPrimary">Отмена</button>
            <button @click="createWallet" :disabled="!newWalletName" class="flex-1 py-3 rounded-2xl font-bold bg-accentLilac text-white disabled:opacity-50">Создать</button>
          </div>
        </div>
      </div>
    </div>

        <!-- Планирование бюджета -->
    <div v-if="showBudgetModal" class="fixed inset-0 bg-bgPrimary z-50 overflow-y-auto">
      <div class="p-6 pb-20">
        <div class="flex justify-between items-center mb-6">
          <button @click="showBudgetModal = false" class="text-textSecondary text-2xl">&times;</button>
          <h2 class="text-xl font-bold text-textPrimary">Планирование</h2>
          <div class="w-8"></div>
        </div>

        <!-- Переключатель месяцев -->
        <div class="flex items-center justify-between bg-cardSurface rounded-2xl p-3 mb-6">
          <button @click="changeMonth(-1)" class="w-10 h-10 rounded-full bg-bgPrimary flex items-center justify-center text-xl">←</button>
          <span class="font-bold text-textPrimary">{{ monthName }}</span>
          <button @click="changeMonth(1)" class="w-10 h-10 rounded-full bg-bgPrimary flex items-center justify-center text-xl">→</button>
        </div>

        <!-- === УМНАЯ ШАПКА: МАТЕМАТИКА БЮДЖЕТА === -->
        <div class="bg-accentLilacLight/30 rounded-2xl p-5 mb-6 border border-accentLilac/20">
          <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p class="text-textSecondary mb-1">Ожидаемый доход</p>
              <p class="text-lg font-bold text-incomeGreen">+{{ totalPlannedIncome }} ₽</p>
            </div>
            <div class="text-right">
              <p class="text-textSecondary mb-1">Запланировано</p>
              <p class="text-lg font-bold text-accentLilac">-{{ totalPlannedExpenses + totalPlannedGoals }} ₽</p>
            </div>
          </div>
          
          <!-- Прогресс-бар распределения -->
          <div class="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
            <div class="h-3 rounded-full transition-all duration-500 bg-accentLilac" 
                 :style="{ width: totalPlannedIncome > 0 ? Math.min(100, ((totalPlannedExpenses + totalPlannedGoals) / totalPlannedIncome) * 100) + '%' : '0%' }">
            </div>
          </div>
          
          <div class="flex justify-between items-center pt-2 border-t border-accentLilac/20">
            <span class="text-sm font-semibold text-textPrimary">Свободно (не распределено):</span>
            <span class="text-xl font-bold" :class="unallocated >= 0 ? 'text-incomeGreen' : 'text-red-500'">
              {{ unallocated }} ₽
            </span>
          </div>
          <p class="text-xs text-textSecondary mt-2 text-center" v-if="unallocated === 0 && totalPlannedIncome > 0">
            🎉 Идеально! Каждый рубль имеет свою цель.
          </p>
        </div>

        <!-- === БЛОК 1: ДОХОДЫ === -->
        <h3 class="font-bold text-textPrimary text-lg mb-3 flex items-center gap-2">
          <span>💰</span> Доходы
        </h3>
        <div class="space-y-3 mb-6">
          <div v-for="cat in categories.filter(c => incomeCategoryNames.includes(c.name))" :key="cat.id" class="bg-cardSurface rounded-2xl p-4">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-xl">{{ cat.emoji }}</span>
              <p class="font-semibold text-textPrimary flex-1">{{ cat.name }}</p>
            </div>
            <div class="flex items-center gap-2">
              <input :value="getPlan(cat.name)" @input="updateBudget(cat.name, $event.target.value)" type="number" placeholder="0" class="flex-1 text-base text-textPrimary bg-bgPrimary rounded-xl p-2 outline-none focus:ring-2 focus:ring-incomeGreen">
              <span class="text-textSecondary">₽</span>
            </div>
          </div>
          <div v-if="categories.filter(c => incomeCategoryNames.includes(c.name)).length === 0" class="text-sm text-textSecondary text-center py-2">
            Нет категорий доходов. Создайте "Зарплата" или "Подработка".
          </div>
        </div>

        <!-- === БЛОК 2: МЕЧТЫ (НАКОПЛЕНИЯ) === -->
        <h3 class="font-bold text-textPrimary text-lg mb-3 flex items-center gap-2">
          <span>✨</span> Мечты (отложить в этом месяце)
        </h3>
        <div class="space-y-3 mb-6">
          <div v-for="goal in goals.filter(g => !g.isArchived)" :key="goal.id" class="bg-cardSurface rounded-2xl p-4 border-l-4" :style="{ borderLeftColor: `#${goal.colorHex}` }">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-xl">{{ goal.emoji }}</span>
              <p class="font-semibold text-textPrimary flex-1">{{ goal.name }}</p>
              <span class="text-xs text-textSecondary">Цель: {{ goal.targetAmount }} ₽</span>
            </div>
            <div class="flex items-center gap-2">
              <input :value="getPlan(goal.name)" @input="updateBudget(goal.name, $event.target.value)" type="number" placeholder="0" class="flex-1 text-base text-textPrimary bg-bgPrimary rounded-xl p-2 outline-none focus:ring-2 focus:ring-accentLilac">
              <span class="text-textSecondary">₽</span>
            </div>
          </div>
          <div v-if="goals.filter(g => !g.isArchived).length === 0" class="text-sm text-textSecondary text-center py-2">
            Нет активных мечт.
          </div>
        </div>

        <!-- === БЛОК 3: РАСХОДЫ === -->
        <h3 class="font-bold text-textPrimary text-lg mb-3 flex items-center gap-2">
          <span>🛒</span> Расходы
        </h3>
        <div class="space-y-3">
          <div v-for="cat in categories.filter(c => !incomeCategoryNames.includes(c.name) && !c.isHidden)" :key="cat.id" class="bg-cardSurface rounded-2xl p-4">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-xl">{{ cat.emoji }}</span>
              <p class="font-semibold text-textPrimary flex-1">{{ cat.name }}</p>
            </div>
            <div class="flex items-center gap-2 mb-2">
              <input :value="getPlan(cat.name)" @input="updateBudget(cat.name, $event.target.value)" type="number" placeholder="0" class="flex-1 text-base text-textPrimary bg-bgPrimary rounded-xl p-2 outline-none focus:ring-2 focus:ring-accentLilac">
              <span class="text-textSecondary">₽</span>
            </div>
            <div class="flex justify-between text-xs text-textSecondary px-1">
              <span>Потрачено: {{ getCategorySpent(cat.name) }} ₽</span>
              <span :class="getPlan(cat.name) - getCategorySpent(cat.name) < 0 ? 'text-red-500 font-bold' : 'text-incomeGreen font-bold'">
                Остаток: {{ getPlan(cat.name) - getCategorySpent(cat.name) }} ₽
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { collection, addDoc, updateDoc, doc, onSnapshot, deleteDoc, query, where } from 'firebase/firestore'
import { auth, db } from './firebase' 
import { signOut, onAuthStateChanged } from 'firebase/auth'
import Auth from './Auth.vue'

ChartJS.register(ArcElement, Tooltip, Legend)

const user = ref(null)
const userName = computed(() => user.value?.displayName || user.value?.email?.split('@')[0] || 'Пользователь')

// UI State
const showAddModal = ref(false)
const showAddCategory = ref(false)
const showMenu = ref(false)
const showWallets = ref(false)
const showAddWallet = ref(false)
const showGoals = ref(false)
const showAddGoal = ref(false)
const showTopUpGoal = ref(false)
const editingTransactionId = ref(null)

// Transaction State
const newAmount = ref('')
const newCategory = ref('Продукты')
const newWallet = ref('')
const newType = ref('expense')
const newComment = ref('')
const transferFrom = ref('')
const transferTo = ref('')

// Data
const transactions = ref([])
const categories = ref([])
const wallets = ref([])
const goals = ref([])

// Budget State
const showBudgetModal = ref(false)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const budgets = ref([])

// Category/Wallet/Goal creation state
const newCategoryName = ref('')
const newCategoryEmoji = ref('✨')
const newCategoryColor = ref('F4E1E6')
const newWalletName = ref('')
const newWalletBalance = ref('0')
const newWalletEmoji = ref('💳')
const includeInTotal = ref(true)
const newGoalName = ref('')
const newGoalTarget = ref('')
const newGoalEmoji = ref('✨')
const newGoalColor = ref('F4E1E6')
const currentGoal = ref(null)
const topUpAmount = ref('')
const topUpWallet = ref('')

const emojiOptions = ['🛒', '☕️', '🚗', '👗', '💰', '👦🏻', '🏠', '⛽️', '🍔', '🎙️', '🎮', '🏕️', '✈️', '💊', '💃', '🐾', '↔']
const walletEmojiOptions = ['🅰️', '💵', '💳', '💰', '👛', '💎']
const colorOptions = ['F4E1E6', 'fadadd', 'D9A8BA', 'C4B5D4', 'B8C8D8', 'A8C8C8', 'C8B8D4', 'B8D4E8', 'F4B896', 'F5E6E8', 'F5E6C8', 'E5EFE2', 'FADADD', 'C8D8E8', 'D4A8A8', 'F0E6D2', 'D4E8E0', 'A89888', '88C4C0', 'A8C8E0', 'A86878', '1E3A5F', '6B5868', 'B8A898', '4A88C0', 'F0B8C0']

// === HELPERS ===
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
  const transfersOut = walletTransactions.filter(t => t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0)
  const transfersIn = transactions.value.filter(t => t.type === 'transfer' && t.transferTo === walletName).reduce((sum, t) => sum + t.amount, 0)
  return wallet.initialBalance + income - expense - transfersOut + transfersIn
}

// === COMPUTED ===
const totalIncome = computed(() => transactions.value.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0))
const totalExpenses = computed(() => transactions.value.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))

const remaining = computed(() => {
  return wallets.value
    .filter(w => w.includeInTotal !== false)
    .reduce((sum, w) => sum + getWalletBalance(w.name), 0)
})

function getPlan(name) {
  const budget = budgets.value.find(b => b.categoryName === name)
  return budget ? budget.plannedAmount : 0
}

const groupedTransactions = computed(() => {
  const groups = {}
  const [year, month] = selectedMonth.value.split('-').map(Number)
  
  transactions.value.forEach(t => {
    if (t.type !== 'expense') return 
    const date = t.date?.toDate ? t.date.toDate() : new Date(t.date)
    if (date.getMonth() !== month - 1 || date.getFullYear() !== year) return

    const catName = t.categoryName || 'Без категории'
    if (!groups[catName]) {
      groups[catName] = { name: catName, emoji: getCategoryEmoji(catName), total: 0, planned: getPlan(catName), items: [] }
    }
    groups[catName].total += t.amount
    groups[catName].items.push(t)
  })
  
  return Object.values(groups).sort((a, b) => {
    if (a.planned > 0 && b.planned === 0) return -1
    if (a.planned === 0 && b.planned > 0) return 1
    return b.total - a.total
  })
})

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

// === ПЛАНИРОВАНИЕ БЮДЖЕТА (УМНАЯ МАТЕМАТИКА) ===

// Список категорий, которые мы считаем доходами (можешь добавить свои)
const incomeCategoryNames = ['Зарплата', 'Подработка', 'Кэшбэк', 'Проценты', 'Подарок', 'Продажа', 'Дивиденды', 'Возврат']

const monthName = computed(() => {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const date = new Date(selectedMonth.value + '-01')
  return months[date.getMonth()] + ' ' + date.getFullYear()
})

function changeMonth(delta) {
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() + delta)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

function getCategorySpent(categoryName) {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return transactions.value
    .filter(t => {
      if (t.type !== 'expense' || t.categoryName !== categoryName) return false
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date)
      return date.getMonth() === month - 1 && date.getFullYear() === year
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

// === АВТОМАТИЧЕСКИЙ РАСЧЕТ БЮДЖЕТА ===
const totalPlannedIncome = computed(() => {
  return categories.value
    .filter(c => incomeCategoryNames.includes(c.name))
    .reduce((sum, c) => sum + getPlan(c.name), 0)
})

const totalPlannedExpenses = computed(() => {
  return categories.value
    .filter(c => !incomeCategoryNames.includes(c.name) && !c.isHidden)
    .reduce((sum, c) => sum + getPlan(c.name), 0)
})

const totalPlannedGoals = computed(() => {
  return goals.value
    .filter(g => !g.isArchived)
    .reduce((sum, g) => sum + getPlan(g.name), 0)
})

// Свободные средства = Доходы - Расходы - Мечты
const unallocated = computed(() => {
  return totalPlannedIncome.value - totalPlannedExpenses.value - totalPlannedGoals.value
})

// Сохранение плана (работает и для категорий, и для мечт, так как использует имя как ключ)
const updateBudget = async (name, amount) => {
  if (!user.value) return
  const existing = budgets.value.find(b => b.categoryName === name)
  const numAmount = Number(amount) || 0
  
  try {
    if (existing) {
      await updateDoc(doc(db, 'budgets', existing.id), { plannedAmount: numAmount })
    } else {
      await addDoc(collection(db, 'budgets'), {
        userId: user.value.uid,
        month: selectedMonth.value,
        categoryName: name,
        plannedAmount: numAmount
      })
    }
  } catch (error) { console.error('Ошибка сохранения плана:', error) }
}

watch(selectedMonth, () => {
  if (!user.value) return
  const q = query(collection(db, 'budgets'), where('userId', '==', user.value.uid), where('month', '==', selectedMonth.value))
  onSnapshot(q, (snapshot) => {
    budgets.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  })
}, { immediate: true })

// === ACTIONS ===
function setType(type) {
  newType.value = type
  if (type === 'income') newCategory.value = 'Зарплата'
  else if (type === 'expense') newCategory.value = 'Продукты'
  else if (type === 'transfer') { transferFrom.value = ''; transferTo.value = '' }
}

function openAddModal() {
  editingTransactionId.value = null
  newAmount.value = ''
  newType.value = 'expense'
  newCategory.value = 'Продукты'
  newWallet.value = wallets.value.length > 0 ? wallets.value[0].name : ''
  newComment.value = ''
  showAddModal.value = true
}

function openEditModal(transaction) {
  editingTransactionId.value = transaction.id
  newAmount.value = transaction.amount
  newType.value = transaction.type
  newWallet.value = transaction.walletName || (wallets.value.length > 0 ? wallets.value[0].name : '')
  newCategory.value = transaction.categoryName || 'Продукты'
  newComment.value = transaction.comment || ''
  showAddModal.value = true
}

function closeModal() {
  showAddModal.value = false
  editingTransactionId.value = null
  transferFrom.value = ''
  transferTo.value = ''
  newComment.value = ''
}

function logout() { signOut(auth) }

const saveTransaction = async () => {
  if (newType.value === 'transfer') {
    if (!newAmount.value || newAmount.value <= 0 || !transferFrom.value || !transferTo.value || transferFrom.value === transferTo.value || !user.value) return
    try {
      await addDoc(collection(db, 'transactions'), {
        amount: Number(newAmount.value), type: 'transfer', walletName: transferFrom.value, transferTo: transferTo.value,
        categoryName: `Перевод на ${transferTo.value}`, comment: newComment.value, userId: user.value.uid, date: new Date()
      })
      closeModal()
    } catch (error) { console.error('Ошибка перевода:', error); alert('Ошибка: ' + error.message) }
    return
  }

  if (!newAmount.value || newAmount.value <= 0 || !newCategory.value || !newWallet.value || !user.value) return
  const transactionData = { amount: Number(newAmount.value), categoryName: newCategory.value, walletName: newWallet.value, type: newType.value, comment: newComment.value, userId: user.value.uid, date: new Date() }

  try {
    if (editingTransactionId.value) await updateDoc(doc(db, 'transactions', editingTransactionId.value), transactionData)
    else await addDoc(collection(db, 'transactions'), transactionData)
    closeModal()
  } catch (error) { console.error('Ошибка сохранения:', error); alert('Ошибка: ' + error.message) }
}

const createCategory = async () => {
  if (!newCategoryName.value || !user.value) return
  try {
    await addDoc(collection(db, 'categories'), { name: newCategoryName.value, emoji: newCategoryEmoji.value, colorHex: newCategoryColor.value, isHidden: false, userId: user.value.uid })
    newCategory.value = newCategoryName.value; newCategoryName.value = ''; newCategoryEmoji.value = '✨'; newCategoryColor.value = 'F4E1E6'; showAddCategory.value = false
  } catch (error) { console.error('Ошибка создания категории:', error) }
}

const createWallet = async () => {
  if (!newWalletName.value || !user.value) return
  try {
    await addDoc(collection(db, 'wallets'), { name: newWalletName.value, emoji: newWalletEmoji.value, colorHex: 'A594B6', initialBalance: Number(newWalletBalance.value) || 0, isArchived: false, includeInTotal: includeInTotal.value, userId: user.value.uid })
    newWalletName.value = ''; newWalletBalance.value = '0'; newWalletEmoji.value = '💳'; includeInTotal.value = true; showAddWallet.value = false
  } catch (error) { console.error('Ошибка создания кошелька:', error) }
}

function openTopUpGoal(goal) {
  currentGoal.value = goal; topUpAmount.value = ''; topUpWallet.value = wallets.value.length > 0 ? wallets.value[0].name : ''; showTopUpGoal.value = true
}

const topUpGoal = async () => {
  if (!currentGoal.value || !topUpAmount.value || topUpAmount.value <= 0 || !topUpWallet.value || !user.value) return
  const amount = Number(topUpAmount.value)
  try {
    await updateDoc(doc(db, 'goals', currentGoal.value.id), { currentAmount: currentGoal.value.currentAmount + amount })
    await addDoc(collection(db, 'transactions'), { amount, categoryName: `Мечта: ${currentGoal.value.name}`, walletName: topUpWallet.value, type: 'expense', userId: user.value.uid, date: new Date() })
    showTopUpGoal.value = false; currentGoal.value = null; topUpAmount.value = ''
  } catch (error) { console.error('Ошибка пополнения:', error) }
}

const createGoal = async () => {
  if (!newGoalName.value || !newGoalTarget.value || !user.value) return
  try {
    await addDoc(collection(db, 'goals'), { name: newGoalName.value, targetAmount: Number(newGoalTarget.value), currentAmount: 0, emoji: newGoalEmoji.value, colorHex: newGoalColor.value, isArchived: false, userId: user.value.uid })
    newGoalName.value = ''; newGoalTarget.value = ''; newGoalEmoji.value = '✨'; newGoalColor.value = 'F4E1E6'; showAddGoal.value = false
  } catch (error) { console.error('Ошибка создания цели:', error) }
}

const deleteGoal = async (id) => {
  if (!confirm('Удалить эту цель?')) return
  try { await deleteDoc(doc(db, 'goals', id)) } catch (error) { console.error('Ошибка удаления цели:', error) }
}

const deleteTransaction = async (id) => {
  if (!confirm('Удалить эту транзакцию?')) return
  try { await deleteDoc(doc(db, 'transactions', id)) } catch (error) { console.error('Ошибка удаления:', error) }
}

// === INIT ===
onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      const uid = currentUser.uid
      onSnapshot(query(collection(db, 'categories'), where('userId', '==', uid)), (s) => categories.value = s.docs.map(d => ({ id: d.id, ...d.data() })))
      onSnapshot(query(collection(db, 'wallets'), where('userId', '==', uid)), (s) => {
        wallets.value = s.docs.map(d => ({ id: d.id, ...d.data() }))
        if (wallets.value.length > 0 && !newWallet.value) newWallet.value = wallets.value[0].name
      })
      onSnapshot(query(collection(db, 'goals'), where('userId', '==', uid)), (s) => goals.value = s.docs.map(d => ({ id: d.id, ...d.data() })))
      onSnapshot(query(collection(db, 'transactions'), where('userId', '==', uid)), (s) => transactions.value = s.docs.map(d => ({ id: d.id, ...d.data() })))
    } else {
      transactions.value = []; categories.value = []; wallets.value = []; goals.value = []; budgets.value = []
    }
  })
})
</script>