import {useEffect, useMemo, useRef, useState} from 'react';
import {
    analyzeDietImage,
    createDietEntry,
    deleteDietEntry,
    getDietCoachFeedback,
    getDietEntries,
    toggleDietFavorite,
    updateDietEntry,
    updateDietGoals
} from '../../api/dietApi.js';
import {getCurrentUser} from '../../api/authApi.js';
import './DietPage.css';

const DEFAULT_DAILY_GOALS = {calories: 2000, protein: 100, carbs: 300, fat: 60};
const NUTRIENT_TYPES = [
    {key: 'protein', label: '단백질', barClass: 'nutrientBarProtein'},
    {key: 'carbs', label: '탄수화물', barClass: 'nutrientBarCarbs'},
    {key: 'fat', label: '지방', barClass: 'nutrientBarFat'},
];
const ACTION_BUTTONS = [
    {id: 'aiUpload', label: '📸 AI 음식 사진 분석', variant: 'analysisButtonPrimary', ariaLabel: 'AI 음식 사진 분석'},
    {id: 'manualInput', label: '✏️ 직접 입력', variant: 'analysisButtonSecondary', ariaLabel: '직접 입력'},
    {id: 'favorites', label: '⭐ 즐겨찾기', variant: 'analysisButtonSecondary', ariaLabel: '즐겨찾기'},
];
const FOOD_TAGS = [
    {key: 'protein', label: '단백질', className: 'nutrientTagProtein'},
    {key: 'carbs', label: '탄수화물', className: 'nutrientTagCarbs'},
    {key: 'fat', label: '지방', className: 'nutrientTagFat'},
];

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const makeDefaultDietTitle = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
    }).formatToParts(date).reduce((acc, part) => ({...acc, [part.type]: part.value}), {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}시`;
};

const makeKstDateInputValue = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
}).format(date);

const makeKstDateTimeLabel = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date).reduce((acc, part) => ({...acc, [part.type]: part.value}), {});
    return `${parts.year}.${parts.month}.${parts.day}. ${parts.hour}:${parts.minute} KST`;
};

const calculateTotals = (items) => ({
    calories: items.reduce((sum, item) => sum + toNumber(item.calories), 0),
    protein: items.reduce((sum, item) => sum + toNumber(item.protein), 0),
    carbs: items.reduce((sum, item) => sum + toNumber(item.carbs), 0),
    fat: items.reduce((sum, item) => sum + toNumber(item.fat), 0),
});

const normalizeItems = (items) => items.map((item) => ({
    ...item,
    name: item.name || '새 음식',
    calories: toNumber(item.calories),
    protein: toNumber(item.protein),
    carbs: toNumber(item.carbs),
    fat: toNumber(item.fat),
}));

const INITIAL_AI_PREVIEW = {
    id: 1,
    image: '🍽️',
    imagePreview: '',
    items: [],
};

const createManualForm = (targetDietId = '') => ({
    title: makeDefaultDietTitle(),
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    addMode: 'new',
    targetDietId,
});

const createAiSaveForm = (targetDietId = '') => ({
    title: makeDefaultDietTitle(),
    addMode: 'new',
    targetDietId,
});

const createEmptyItem = (id, index) => ({id, name: `새 음식 ${index}`, calories: 0, protein: 0, carbs: 0, fat: 0});

function ModalShell({titleId, title, children, actions}) {
    return (
        <div className="dietUploadModalOverlay" role="presentation">
            <div className="dietUploadModal" role="dialog" aria-modal="true" aria-labelledby={titleId}
                 onClick={(e) => e.stopPropagation()}>
                <div className="dietUploadModalHeader"><h3 id={titleId} className="dietUploadModalTitle">{title}</h3>
                </div>
                {children}
                {actions}
            </div>
        </div>
    );
}

function AIAnalysisFoodCard({preview, onSave, onOpenEdit}) {
    const totals = calculateTotals(preview.items);
    const hasItems = preview.items.length > 0;
    return (
        <div className="aiAnalysisFoodCard">
            <div className="aiAnalysisFoodTitle">AI 비전 분석 - 인식 결과 미리보기</div>
            <div className="aiAnalysisFoodBody">
                <div className="aiAnalysisFoodImage">
                    {preview.imagePreview ? <img className="aiAnalysisFoodPreviewImage" src={preview.imagePreview}
                                                 alt="업로드 음식 미리보기"/> : preview.image}
                </div>
                <div className="aiAnalysisFoodContent">
                    {hasItems ? <div
                            className="aiAnalysisFoodSubtitle aiAnalysisFoodSubtitleMain">총 {totals.calories} kcal</div> :
                        <div className="aiAnalysisEmptyStateTitle">분석 결과 없음</div>}
                    {hasItems ? (
                        <div className="aiAnalysisItemList">
                            {preview.items.map((item) => (
                                <div key={item.id} className="aiAnalysisItemRow">
                                    <span className="aiAnalysisItemName">{item.name}</span>
                                    <span
                                        className="aiAnalysisItemMeta">{item.calories}kcal · 단백질 {item.protein}g · 탄수 {item.carbs}g · 지방 {item.fat}g</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="aiAnalysisEmptyStateDesc">사진 업로드 후 분석을 시작하거나, 수정에서 항목을 직접 추가해 주세요.</p>
                    )}
                    <div className="aiAnalysisFoodActions">
                        <button className="aiAnalysisActionButton aiAnalysisActionButtonComplete" onClick={onSave}
                                disabled={!hasItems}>저장
                        </button>
                        <button className="aiAnalysisActionButton aiAnalysisActionButtonEdit" onClick={onOpenEdit}>수정
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FoodCard({diet, isFavorite, isExpanded, onToggleExpand, onToggleFavorite, onEdit, onDelete}) {
    const detailText = diet.items.map((item) => item.name).join(' · ');
    return (
        <div className={`foodCard${isExpanded ? ' isExpanded' : ''}`} onClick={() => onToggleExpand(diet.id)}>
            <div className="foodCardHeader">
                <div className="foodCardTitle">{diet.title}</div>
                <div className="foodCardNutrients">
                    <div className="nutrientTag nutrientTagKcal">{diet.calories} kcal</div>
                    {FOOD_TAGS.map((tag) => <div key={tag.key}
                                                 className={`nutrientTag ${tag.className}`}>{tag.label} {diet[tag.key]}g</div>)}
                </div>
            </div>
            <div className="foodCardFooter">
                <p className="foodCardDetail">{detailText}</p>
                <div className="foodCardActionGroup">
                    <button type="button" className="foodCardActionButton" onClick={(e) => {
                        e.stopPropagation();
                        onEdit(diet);
                    }}>수정
                    </button>
                    <button type="button" className="foodCardActionButton foodCardActionButtonDanger" onClick={(e) => {
                        e.stopPropagation();
                        onDelete(diet.id);
                    }}>삭제
                    </button>
                    <button
                        type="button"
                        className={`foodCardFavoriteButton${isFavorite ? ' isActive' : ''}`}
                        aria-label={`${diet.title} 즐겨찾기`}
                        aria-pressed={isFavorite}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(diet.id);
                        }}
                    >
                        <svg className="foodCardFavoriteIcon" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M12 3.2l2.65 5.36 5.92.86-4.28 4.17 1.01 5.9L12 16.7l-5.3 2.79 1.01-5.9L3.43 9.42l5.92-.86L12 3.2z"/>
                        </svg>
                    </button>
                </div>
            </div>
            {isExpanded ? (
                <div className="foodCardExpanded">
                    {diet.items.map((item) => (
                        <div key={item.id} className="foodCardExpandedRow">
                            <span className="foodCardExpandedName">{item.name}</span>
                            <span
                                className="foodCardExpandedMeta">{item.calories} kcal · 단백질 {item.protein}g · 탄수화물 {item.carbs}g · 지방 {item.fat}g</span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function NutrientGoalItem({label, value, percent, goal, barClass}) {
    return (
        <div className="nutrientGoalItem">
            <div className="nutrientGoalLabel">
                <span className="nutrientGoalLabelText">{label}</span>
                <span className="nutrientGoalValue">{value} / {goal}</span>
            </div>
            <div className="nutrientSmallProgressBar">
                <div className={`nutrientSmallProgressBarFill ${barClass}`}
                     style={{width: `${Math.min(percent, 100)}%`}}/>
            </div>
        </div>
    );
}

function NutritionGoalCard({totalCalories, totalProtein, totalCarbs, totalFat, percentages, goals, onOpenGoalModal}) {
    const remainingCalories = goals.calories - totalCalories;
    const remainingText = remainingCalories >= 0 ? `잔여 ${remainingCalories} kcal` : `${Math.abs(remainingCalories)} kcal 초과`;
    const nutrientValues = {protein: totalProtein, carbs: totalCarbs, fat: totalFat};
    return (
        <div className="nutritionGoalCard">
            <div className="nutritionGoalHeader">
                <span className="nutritionGoalIcon">🎯</span>
                <h3 className="nutritionGoalTitle">오늘의 영양 목표</h3>
                <button type="button" className="nutritionGoalEditButton" onClick={onOpenGoalModal}>목표 변경</button>
            </div>
            <div className="nutritionGoalKcalBlock"><p className="nutritionGoalCurrentKcal">{totalCalories}</p><p
                className="nutritionGoalTargetKcal">/ {goals.calories} kcal</p></div>
            <div className="totalCaloriesSection">
                <div className="progressBar">
                    <div className="progressBarFill" style={{width: `${Math.min(percentages.calories, 100)}%`}}/>
                </div>
                <p className="nutritionGoalRemaining">{remainingText}</p></div>
            <div className="nutrientsGrid">{NUTRIENT_TYPES.map((n) => <NutrientGoalItem key={n.key} label={n.label}
                                                                                        goal={goals[n.key]}
                                                                                        value={nutrientValues[n.key]}
                                                                                        percent={percentages[n.key]}
                                                                                        barClass={n.barClass}/>)}</div>
        </div>
    );
}

function DietPage() {
    const [diets, setDiets] = useState([]);
    const [dailyGoals, setDailyGoals] = useState(DEFAULT_DAILY_GOALS);
    const [isSavingGoals, setIsSavingGoals] = useState(false);
    const [foodNameSuggestions, setFoodNameSuggestions] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [pendingFavoriteIds, setPendingFavoriteIds] = useState([]);
    const [expandedDietIds, setExpandedDietIds] = useState([]);
    const [aiPreview, setAiPreview] = useState(INITIAL_AI_PREVIEW);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [aiAnalysisError, setAiAnalysisError] = useState('');
    const [isAiCoachLoading, setIsAiCoachLoading] = useState(false);
    const [aiCoachMessage, setAiCoachMessage] = useState('식단을 추가하면 AI 코치 피드백이 표시됩니다.');
    const [lastCoachAnalyzedAt, setLastCoachAnalyzedAt] = useState('');
    const [coachAnalyzedDate, setCoachAnalyzedDate] = useState('');
    const [lastCoachAnalyzedSignature, setLastCoachAnalyzedSignature] = useState('');
    const [userProfileNote, setUserProfileNote] = useState('');
    const [userProfile, setUserProfile] = useState({
        profile_note: '',
        height_cm: '',
        weight_kg: '',
        skeletal_muscle_kg: '',
        body_fat_kg: '',
    });
    const [selectedDate, setSelectedDate] = useState(() => makeKstDateInputValue());
    const [dateDraft, setDateDraft] = useState(() => makeKstDateInputValue());

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [selectedImagePreview, setSelectedImagePreview] = useState('');

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState(createManualForm());

    const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
    const [favoritesTitle, setFavoritesTitle] = useState(makeDefaultDietTitle());
    const [favoritesSourceEntries, setFavoritesSourceEntries] = useState([]);
    const [favoriteBaseIds, setFavoriteBaseIds] = useState([]);

    const [isAiEditModalOpen, setIsAiEditModalOpen] = useState(false);
    const [aiEditForm, setAiEditForm] = useState({itemId: null, items: []});

    const [isAiSaveModalOpen, setIsAiSaveModalOpen] = useState(false);
    const [aiSaveForm, setAiSaveForm] = useState(createAiSaveForm());

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalForm, setGoalForm] = useState(DEFAULT_DAILY_GOALS);

    const [isDietEditModalOpen, setIsDietEditModalOpen] = useState(false);
    const [dietEditForm, setDietEditForm] = useState({dietId: null, title: '', itemId: null, items: []});

    const fileInputRef = useRef(null);
    const uploadTriggerRef = useRef(null);
    const nextItemIdRef = useRef(1000);
    const entryLoadSeqRef = useRef(0);

    const applyEntries = (entries) => {
        setDiets(entries);
        setFavoriteIds(entries.filter((entry) => entry.is_favorite).map((entry) => entry.id));
    };

    const isEntryOnSelectedDate = (entry) => (entry?.recorded_at || '').slice(0, 10) === selectedDate;

    const upsertEntry = (entry) => {
        if (!isEntryOnSelectedDate(entry)) {
            removeEntry(entry.id);
            return;
        }
        setDiets((prev) => {
            const exists = prev.some((item) => item.id === entry.id);
            if (!exists) return [entry, ...prev];
            return prev.map((item) => (item.id === entry.id ? entry : item));
        });
        setFavoriteIds((prev) => {
            if (entry.is_favorite) return prev.includes(entry.id) ? prev : [...prev, entry.id];
            return prev.filter((id) => id !== entry.id);
        });
    };

    const removeEntry = (entryId) => {
        setDiets((prev) => prev.filter((diet) => diet.id !== entryId));
        setFavoriteIds((prev) => prev.filter((id) => id !== entryId));
        setExpandedDietIds((prev) => prev.filter((id) => id !== entryId));
    };

    const nutritionTotals = useMemo(() => ({
        calories: diets.reduce((sum, diet) => sum + toNumber(diet.calories), 0),
        protein: diets.reduce((sum, diet) => sum + toNumber(diet.protein), 0),
        carbs: diets.reduce((sum, diet) => sum + toNumber(diet.carbs), 0),
        fat: diets.reduce((sum, diet) => sum + toNumber(diet.fat), 0),
    }), [diets]);

    const percentages = useMemo(() => ({
        calories: dailyGoals.calories > 0 ? Math.round((nutritionTotals.calories / dailyGoals.calories) * 100) : 0,
        protein: dailyGoals.protein > 0 ? Math.round((nutritionTotals.protein / dailyGoals.protein) * 100) : 0,
        carbs: dailyGoals.carbs > 0 ? Math.round((nutritionTotals.carbs / dailyGoals.carbs) * 100) : 0,
        fat: dailyGoals.fat > 0 ? Math.round((nutritionTotals.fat / dailyGoals.fat) * 100) : 0,
    }), [nutritionTotals, dailyGoals]);

    const favoriteDiets = useMemo(
        () => favoritesSourceEntries.filter((diet) => pendingFavoriteIds.includes(diet.id)),
        [favoritesSourceEntries, pendingFavoriteIds]
    );

    const coachAnalysisSignature = useMemo(() => JSON.stringify({
        goals: dailyGoals,
        entries: diets.map((diet) => ({
            id: diet.id,
            title: diet.title,
            calories: diet.calories,
            protein: diet.protein,
            carbs: diet.carbs,
            fat: diet.fat,
            items: diet.items,
        })),
    }), [selectedDate, dailyGoals, diets]);

    const needsCoachRefresh = diets.length > 0 && (coachAnalyzedDate !== selectedDate || coachAnalysisSignature !== lastCoachAnalyzedSignature);

    const selectedAiItem = useMemo(() => aiEditForm.items.find((item) => item.id === aiEditForm.itemId), [aiEditForm]);
    const selectedDietItem = useMemo(() => dietEditForm.items.find((item) => item.id === dietEditForm.itemId), [dietEditForm]);
    const canUseExistingDiet = diets.length > 0;

    const getNextItemId = () => {
        const next = nextItemIdRef.current;
        nextItemIdRef.current += 1;
        return next;
    };

    const appendDiet = async (title, items) => {
        const payload = {
            title: title || makeDefaultDietTitle(),
            recorded_date: selectedDate,
            items: normalizeItems(items).map((item, index) => ({
                name: item.name,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                sort_order: index + 1,
            })),
        };
        const response = await createDietEntry(payload);
        if (response.entry) upsertEntry(response.entry);
    };

    const closeUploadModal = () => {
        setIsUploadModalOpen(false);
        setSelectedImageFile(null);
        setSelectedImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (uploadTriggerRef.current) uploadTriggerRef.current.focus();
    };
    const closeManualModal = () => {
        setIsManualModalOpen(false);
        setManualForm(createManualForm());
    };
    const closeFavoritesModal = async () => {
        const currentFavoriteSet = new Set(favoriteBaseIds);
        const nextFavoriteSet = new Set(pendingFavoriteIds);
        const changedIds = favoritesSourceEntries
            .map((diet) => diet.id)
            .filter((id) => currentFavoriteSet.has(id) !== nextFavoriteSet.has(id));

        if (changedIds.length > 0) {
            try {
                const responses = await Promise.all(changedIds.map((id) => toggleDietFavorite(id, nextFavoriteSet.has(id))));
                responses.forEach((result) => {
                    if (result?.entry) upsertEntry(result.entry);
                });
            } catch (error) {
                console.error('즐겨찾기 저장 실패:', error);
            }
        }
        setIsFavoritesModalOpen(false);
        setFavoritesTitle(makeDefaultDietTitle());
        setPendingFavoriteIds([]);
        setFavoriteBaseIds([]);
        setFavoritesSourceEntries([]);
    };
    const closeAiEditModal = () => setIsAiEditModalOpen(false);
    const closeAiSaveModal = () => {
        setIsAiSaveModalOpen(false);
        setAiSaveForm(createAiSaveForm());
    };
    const closeGoalModal = () => {
        setIsGoalModalOpen(false);
        setGoalForm(dailyGoals);
    };
    const closeDietEditModal = () => setIsDietEditModalOpen(false);

    const closeTopModalOnEscape = () => {
        if (isDietEditModalOpen) return closeDietEditModal();
        if (isAiSaveModalOpen) return closeAiSaveModal();
        if (isGoalModalOpen) return closeGoalModal();
        if (isAiEditModalOpen) return closeAiEditModal();
        if (isFavoritesModalOpen) return closeFavoritesModal();
        if (isManualModalOpen) return closeManualModal();
        if (isUploadModalOpen) return closeUploadModal();
    };

    useEffect(() => {
        const hasModal = isUploadModalOpen || isManualModalOpen || isFavoritesModalOpen || isAiEditModalOpen || isAiSaveModalOpen || isGoalModalOpen || isDietEditModalOpen;
        if (!hasModal) return;
        const onEscape = (event) => {
            if (event.key === 'Escape') closeTopModalOnEscape();
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [isUploadModalOpen, isManualModalOpen, isFavoritesModalOpen, isAiEditModalOpen, isAiSaveModalOpen, isGoalModalOpen, isDietEditModalOpen]);

    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const data = await getCurrentUser();
                const profile = data?.user?.profile || {};
                setUserProfile({
                    profile_note: profile.profile_note || data?.user?.profile_note || '',
                    height_cm: profile.height_cm ?? data?.user?.height_cm ?? '',
                    weight_kg: profile.weight_kg ?? data?.user?.weight_kg ?? '',
                    skeletal_muscle_kg: profile.skeletal_muscle_kg ?? data?.user?.skeletal_muscle_kg ?? '',
                    body_fat_kg: profile.body_fat_kg ?? data?.user?.body_fat_kg ?? '',
                });
                setUserProfileNote(profile.profile_note || data?.user?.profile_note || '');
            } catch (error) {
                console.error('사용자 정보 조회 실패:', error);
            }
        };
        loadCurrentUser();
    }, []);

    useEffect(() => {
        const loadEntries = async () => {
            const seq = ++entryLoadSeqRef.current;
            try {
                const data = await getDietEntries({date: selectedDate});
                if (seq !== entryLoadSeqRef.current) return;
                applyEntries(data.entries || []);
                if (data.goals) {
                    setDailyGoals({
                        calories: toNumber(data.goals.calories) || DEFAULT_DAILY_GOALS.calories,
                        protein: toNumber(data.goals.protein) || DEFAULT_DAILY_GOALS.protein,
                        carbs: toNumber(data.goals.carbs) || DEFAULT_DAILY_GOALS.carbs,
                        fat: toNumber(data.goals.fat) || DEFAULT_DAILY_GOALS.fat,
                    });
                }
                setFoodNameSuggestions(Array.isArray(data.food_name_suggestions) ? data.food_name_suggestions : []);
            } catch (error) {
                console.error('식단 목록 조회 실패:', error);
            }
        };
        loadEntries();
    }, [selectedDate]);

    const handleRequestAiCoach = async () => {
        if (isAiCoachLoading) return;
        if (diets.length === 0) {
            setAiCoachMessage('분석할 식단이 없습니다. 먼저 식단을 추가해 주세요.');
            return;
        }
        setIsAiCoachLoading(true);
        try {
            const response = await getDietCoachFeedback({
                selected_date: selectedDate,
                profile_note: userProfileNote,
                height_cm: userProfile.height_cm,
                weight_kg: userProfile.weight_kg,
                skeletal_muscle_kg: userProfile.skeletal_muscle_kg,
                body_fat_kg: userProfile.body_fat_kg,
                goals: dailyGoals,
                totals: nutritionTotals,
                entries: diets.map((diet) => ({
                    id: diet.id,
                    title: diet.title,
                    calories: diet.calories,
                    protein: diet.protein,
                    carbs: diet.carbs,
                    fat: diet.fat,
                    items: diet.items,
                })),
            });
            setAiCoachMessage((response?.feedback || '').trim() || 'AI 코치 응답이 비어 있습니다.');
            setLastCoachAnalyzedAt(response?.analyzed_at_label || makeKstDateTimeLabel());
            setCoachAnalyzedDate(response?.analyzed_date || selectedDate);
            setLastCoachAnalyzedSignature(coachAnalysisSignature);
        } catch (error) {
            setAiCoachMessage(error?.response?.data?.message || 'AI 코치 분석에 실패했습니다.');
        } finally {
            setIsAiCoachLoading(false);
        }
    };

    const handleDateFilterSubmit = (event) => {
        event.preventDefault();
        if (!dateDraft) return;
        setSelectedDate(dateDraft);
    };

    const openGoalModal = () => {
        setGoalForm(dailyGoals);
        setIsGoalModalOpen(true);
    };

    const handleGoalInput = (key, value) => {
        setGoalForm((prev) => ({...prev, [key]: Math.max(0, toNumber(value))}));
    };

    const handleSaveGoals = async (nextGoals) => {
        try {
            setIsSavingGoals(true);
            const response = await updateDietGoals(nextGoals);
            if (response?.goals) {
                setDailyGoals({
                    calories: toNumber(response.goals.calories) || DEFAULT_DAILY_GOALS.calories,
                    protein: toNumber(response.goals.protein) || DEFAULT_DAILY_GOALS.protein,
                    carbs: toNumber(response.goals.carbs) || DEFAULT_DAILY_GOALS.carbs,
                    fat: toNumber(response.goals.fat) || DEFAULT_DAILY_GOALS.fat,
                });
            }
            setIsGoalModalOpen(false);
            return true;
        } catch (error) {
            console.error('영양 목표 저장 실패:', error);
            return false;
        } finally {
            setIsSavingGoals(false);
        }
    };

    const handleActionClick = (actionId) => {
        if (actionId === 'aiUpload') setIsUploadModalOpen(true);
        if (actionId === 'manualInput') {
            setManualForm(createManualForm(diets[0] ? String(diets[0].id) : ''));
            setIsManualModalOpen(true);
        }
        if (actionId === 'favorites') {
            setFavoritesTitle(makeDefaultDietTitle());
            getDietEntries({all: 1}).then((data) => {
                const allEntries = data.entries || [];
                const allFavoriteIds = allEntries.filter((entry) => entry.is_favorite).map((entry) => entry.id);
                setFavoritesSourceEntries(allEntries);
                setFavoriteBaseIds(allFavoriteIds);
                setPendingFavoriteIds(allFavoriteIds);
                setIsFavoritesModalOpen(true);
            }).catch((error) => {
                console.error('전체 즐겨찾기 목록 조회 실패:', error);
                setFavoritesSourceEntries(diets);
                setFavoriteBaseIds(favoriteIds);
                setPendingFavoriteIds(favoriteIds);
                setIsFavoritesModalOpen(true);
            });
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedImageFile(file);
        if (!file) {
            setSelectedImagePreview('');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setSelectedImagePreview(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
    };

    const handleStartAnalysis = async () => {
        if (!selectedImageFile || !selectedImagePreview) return;
        setIsAnalyzingImage(true);
        setAiAnalysisError('');
        try {
            const response = await analyzeDietImage(selectedImageFile);
            const analyzedItems = normalizeItems((response?.items || []).map((item) => ({
                id: getNextItemId(),
                name: item.name,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
            })));
            setAiPreview((prev) => ({
                ...prev,
                imagePreview: selectedImagePreview,
                items: analyzedItems,
            }));
            closeUploadModal();
        } catch (error) {
            setAiAnalysisError(error?.response?.data?.message || 'AI 이미지 분석에 실패했습니다.');
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const handleSaveAiDiet = () => {
        setAiSaveForm(createAiSaveForm(diets[0] ? String(diets[0].id) : ''));
        setIsAiSaveModalOpen(true);
    };

    const handleConfirmAiSave = async () => {
        try {
            if (aiSaveForm.addMode === 'existing' && aiSaveForm.targetDietId && canUseExistingDiet) {
                const targetDietId = Number(aiSaveForm.targetDietId);
                const target = diets.find((diet) => diet.id === targetDietId);
                if (target) {
                    const merged = [...target.items, ...normalizeItems(aiPreview.items)];
                    const response = await updateDietEntry(targetDietId, {
                        title: target.title,
                        is_favorite: target.is_favorite,
                        items: merged,
                    });
                    if (response.entry) upsertEntry(response.entry);
                }
            } else {
                await appendDiet(aiSaveForm.title.trim() || makeDefaultDietTitle(), aiPreview.items);
            }
            setAiPreview({...INITIAL_AI_PREVIEW, items: []});
            closeAiSaveModal();
        } catch (error) {
            console.error('AI 결과 저장 실패:', error);
        }
    };

    const openAiEditModal = () => {
        const cloned = aiPreview.items.map((item) => ({...item}));
        setAiEditForm({itemId: cloned[0]?.id || null, items: cloned});
        setIsAiEditModalOpen(true);
    };

    const handleAiEditSelectItem = (itemId) => setAiEditForm((prev) => ({...prev, itemId: Number(itemId)}));
    const handleAiEditFieldChange = (key, value) => {
        setAiEditForm((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === prev.itemId ? {
                ...item,
                [key]: key === 'name' ? value : toNumber(value)
            } : item)),
        }));
    };
    const handleAiEditAddItem = () => {
        const newItem = createEmptyItem(getNextItemId(), aiEditForm.items.length + 1);
        setAiEditForm((prev) => ({...prev, itemId: newItem.id, items: [...prev.items, newItem]}));
    };
    const handleAiEditDeleteItem = () => {
        setAiEditForm((prev) => {
            if (!prev.itemId) return prev;
            const filtered = prev.items.filter((item) => item.id !== prev.itemId);
            return {...prev, items: filtered, itemId: filtered[0]?.id || null};
        });
    };
    const handleAiEditSubmit = (event) => {
        event.preventDefault();
        setAiPreview((prev) => ({...prev, items: normalizeItems(aiEditForm.items)}));
        closeAiEditModal();
    };

    const handleToggleFavorite = async (dietId) => {
        const current = diets.find((diet) => diet.id === dietId);
        if (!current) return;
        try {
            const response = await toggleDietFavorite(dietId, !current.is_favorite);
            if (response.entry) upsertEntry(response.entry);
        } catch (error) {
            console.error('즐겨찾기 변경 실패:', error);
        }
    };
    const handleAddFavoriteDiet = async (diet) => {
        try {
            await appendDiet(favoritesTitle.trim() || makeDefaultDietTitle(), diet.items);
            closeFavoritesModal();
        } catch (error) {
            console.error('즐겨찾기 식단 추가 실패:', error);
        }
    };

    const handleRemoveFavoriteInModal = (dietId) => {
        if (!window.confirm('즐겨찾기에서 제거하시겠습니까?')) return;
        setPendingFavoriteIds((prev) => prev.filter((id) => id !== dietId));
    };

    const handleManualSubmit = async (event) => {
        event.preventDefault();
        if (!manualForm.name.trim()) return;
        const item = {
            id: getNextItemId(),
            name: manualForm.name.trim(),
            calories: toNumber(manualForm.calories),
            protein: toNumber(manualForm.protein),
            carbs: toNumber(manualForm.carbs),
            fat: toNumber(manualForm.fat),
        };
        try {
            if (manualForm.addMode === 'existing' && manualForm.targetDietId && canUseExistingDiet) {
                const targetDietId = Number(manualForm.targetDietId);
                const target = diets.find((diet) => diet.id === targetDietId);
                if (target) {
                    const response = await updateDietEntry(targetDietId, {
                        title: target.title,
                        is_favorite: target.is_favorite,
                        items: [...target.items, item],
                    });
                    if (response.entry) upsertEntry(response.entry);
                }
            } else {
                await appendDiet(manualForm.title.trim() || makeDefaultDietTitle(), [item]);
            }
            closeManualModal();
        } catch (error) {
            console.error('직접 입력 저장 실패:', error);
        }
    };

    const openDietEditModal = (diet) => {
        const cloned = diet.items.map((item) => ({...item}));
        setDietEditForm({dietId: diet.id, title: diet.title, itemId: cloned[0]?.id || null, items: cloned});
        setIsDietEditModalOpen(true);
    };
    const handleDietEditSelectItem = (itemId) => setDietEditForm((prev) => ({...prev, itemId: Number(itemId)}));
    const handleDietEditFieldChange = (key, value) => {
        setDietEditForm((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === prev.itemId ? {
                ...item,
                [key]: key === 'name' ? value : toNumber(value)
            } : item)),
        }));
    };
    const handleDietEditAddItem = () => {
        const newItem = createEmptyItem(getNextItemId(), dietEditForm.items.length + 1);
        setDietEditForm((prev) => ({...prev, itemId: newItem.id, items: [...prev.items, newItem]}));
    };
    const handleDietEditDeleteItem = () => {
        setDietEditForm((prev) => {
            if (!prev.itemId) return prev;
            const filtered = prev.items.filter((item) => item.id !== prev.itemId);
            return {...prev, items: filtered, itemId: filtered[0]?.id || null};
        });
    };
    const handleDietEditSubmit = async (event) => {
        event.preventDefault();
        if (dietEditForm.items.length === 0) {
            await handleDeleteDiet(dietEditForm.dietId);
            closeDietEditModal();
            return;
        }
        try {
            const target = diets.find((diet) => diet.id === dietEditForm.dietId);
            if (!target) return;
            const response = await updateDietEntry(dietEditForm.dietId, {
                title: dietEditForm.title.trim() || makeDefaultDietTitle(),
                is_favorite: target.is_favorite,
                items: dietEditForm.items,
            });
            if (response.entry) upsertEntry(response.entry);
            closeDietEditModal();
        } catch (error) {
            console.error('식단 수정 실패:', error);
        }
    };

    const handleDeleteDiet = async (dietId) => {
        if (!window.confirm('식단을 삭제하시겠습니까?')) return;
        try {
            await deleteDietEntry(dietId);
            removeEntry(dietId);
        } catch (error) {
            console.error('식단 삭제 실패:', error);
        }
    };
    const handleToggleExpandDiet = (dietId) => setExpandedDietIds((prev) => (prev.includes(dietId) ? prev.filter((id) => id !== dietId) : [...prev, dietId]));

    return (
        <>
            <div className="dietPageContainer">
                <div className="dietPageMainArea">
                    <div className="dietPageHeader"><h2 className="dietPageTitle">식단관리</h2><span
                        className="aiAnalysisTag">✦ AI 분석 포함</span></div>
                    <div className="aiAnalysisGridLarge">
                        {ACTION_BUTTONS.map((btn) => <button key={btn.id}
                                                             ref={btn.id === 'aiUpload' ? uploadTriggerRef : null}
                                                             className={`analysisButton ${btn.variant}`}
                                                             aria-label={btn.ariaLabel}
                                                             onClick={() => handleActionClick(btn.id)}>{btn.label}</button>)}
                    </div>
                    <div className="aiAnalysisSection">
                        <div className="foodList"><AIAnalysisFoodCard preview={aiPreview} onSave={handleSaveAiDiet}
                                                                      onOpenEdit={openAiEditModal}/></div>
                        {aiAnalysisError ? <p className="dietUploadModalDescription">{aiAnalysisError}</p> : null}
                    </div>
                    <div className="dietListToolbar">
                        <h3 className="dietListToolbarTitle">식단 목록</h3>
                        <form className="dietDateFilterForm" onSubmit={handleDateFilterSubmit}>
                            <input type="date" className="dietDateFilterInput" value={dateDraft}
                                   onChange={(e) => setDateDraft(e.target.value)}/>
                            <button type="submit" className="dietDateFilterButton">조회</button>
                        </form>
                    </div>
                    <div className="foodList">
                        {diets.map((diet) => (
                            <FoodCard key={diet.id} diet={diet} isFavorite={favoriteIds.includes(diet.id)}
                                      isExpanded={expandedDietIds.includes(diet.id)}
                                      onToggleExpand={handleToggleExpandDiet} onToggleFavorite={handleToggleFavorite}
                                      onEdit={openDietEditModal} onDelete={handleDeleteDiet}/>
                        ))}
                    </div>
                </div>
                <aside className="dietPageSidebar">
                    <NutritionGoalCard totalCalories={nutritionTotals.calories} totalProtein={nutritionTotals.protein}
                                       totalCarbs={nutritionTotals.carbs} totalFat={nutritionTotals.fat}
                                       percentages={percentages} goals={dailyGoals} onOpenGoalModal={openGoalModal}/>
                    <div className="aiCoachCard">
                        <div className="aiCoachHeader"><span className="aiCoachIcon">✨</span><h4
                            className="aiCoachTitle">AI 코치 분석</h4>
                            {needsCoachRefresh ? <span className="aiCoachDirtyBadge">재분석 필요</span> : null}
                            <button type="button" className="aiCoachRefreshButton" onClick={handleRequestAiCoach}
                                    disabled={isAiCoachLoading}>{isAiCoachLoading ? '분석 중' : '분석 시작'}</button>
                        </div>
                        {lastCoachAnalyzedAt ? <p className="aiCoachMeta">기준 날짜: {coachAnalyzedDate || '-'} · 마지막
                            분석: {lastCoachAnalyzedAt}</p> : null}
                        <p className="aiCoachContent">{isAiCoachLoading ? '분석 중...' : aiCoachMessage}</p></div>
                </aside>
            </div>

            {isUploadModalOpen ? (
                <ModalShell
                    titleId="upload-modal-title"
                    title="AI 음식 사진 분석"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeUploadModal}>취소</button>
                        <button type="button" className="dietUploadSubmitButton" onClick={handleStartAnalysis}
                                disabled={!selectedImageFile || !selectedImagePreview || isAnalyzingImage}>{isAnalyzingImage ? '분석 중...' : '분석 시작'}
                        </button>
                    </div>}
                >
                    <p className="dietUploadModalDescription">음식 이미지를 업로드하면 AI가 영양 정보를 분석합니다.</p>
                    <div className="dietUploadDropzone">
                        <p className="dietUploadDropzoneText">JPG, PNG 파일 업로드</p>
                        <button type="button" className="dietUploadSelectButton"
                                onClick={() => fileInputRef.current?.click()}>이미지 선택
                        </button>
                        <input ref={fileInputRef} className="dietUploadInput" type="file" accept="image/*"
                               onChange={handleFileChange}/>
                        {selectedImagePreview ?
                            <div className="dietUploadPreviewWrap"><img className="dietUploadPreviewImage"
                                                                        src={selectedImagePreview} alt="업로드 미리보기"/>
                            </div> : null}
                        {selectedImageFile ? <p className="dietUploadFileName"
                                                aria-live="polite">선택됨: {selectedImageFile.name}</p> : null}
                    </div>
                </ModalShell>
            ) : null}

            {isManualModalOpen ? (
                <ModalShell
                    titleId="manual-modal-title"
                    title="직접 입력"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeManualModal}>취소</button>
                        <button type="submit" form="manual-form" className="dietUploadSubmitButton">추가</button>
                    </div>}
                >
                    <form id="manual-form" className="dietInlineForm" onSubmit={handleManualSubmit}>
                        {manualForm.addMode === 'new' ?
                            <label className="dietFormLabel">식단 제목<input className="dietFormInput"
                                                                         value={manualForm.title}
                                                                         onChange={(e) => setManualForm((prev) => ({
                                                                             ...prev,
                                                                             title: e.target.value
                                                                         }))}/></label> : null}
                        <label className="dietFormLabel">음식 이름<input className="dietFormInput"
                                                                     list="diet-food-suggestions"
                                                                     value={manualForm.name}
                                                                     onChange={(e) => setManualForm((prev) => ({
                                                                         ...prev,
                                                                         name: e.target.value
                                                                     }))} required/></label>
                        <datalist id="diet-food-suggestions">{foodNameSuggestions.map((name) => <option key={name}
                                                                                                        value={name}/>)}</datalist>
                        <div className="dietFormGrid">
                            <label className="dietFormLabel">칼로리<input className="dietFormInput" type="number" min="0"
                                                                       value={manualForm.calories}
                                                                       onChange={(e) => setManualForm((prev) => ({
                                                                           ...prev,
                                                                           calories: e.target.value
                                                                       }))} required/></label>
                            <label className="dietFormLabel">단백질(g)<input className="dietFormInput" type="number"
                                                                          min="0" value={manualForm.protein}
                                                                          onChange={(e) => setManualForm((prev) => ({
                                                                              ...prev,
                                                                              protein: e.target.value
                                                                          }))}/></label>
                            <label className="dietFormLabel">탄수화물(g)<input className="dietFormInput" type="number"
                                                                           min="0" value={manualForm.carbs}
                                                                           onChange={(e) => setManualForm((prev) => ({
                                                                               ...prev,
                                                                               carbs: e.target.value
                                                                           }))}/></label>
                            <label className="dietFormLabel">지방(g)<input className="dietFormInput" type="number" min="0"
                                                                         value={manualForm.fat}
                                                                         onChange={(e) => setManualForm((prev) => ({
                                                                             ...prev,
                                                                             fat: e.target.value
                                                                         }))}/></label>
                        </div>
                        <div className="dietFormRadioRow">
                            <label><input type="radio" name="add-mode" value="new"
                                          checked={manualForm.addMode === 'new'}
                                          onChange={(e) => setManualForm((prev) => ({
                                              ...prev,
                                              addMode: e.target.value
                                          }))}/> 추가</label>
                            <label><input type="radio" name="add-mode" value="existing"
                                          disabled={!canUseExistingDiet}
                                          checked={manualForm.addMode === 'existing'}
                                          onChange={(e) => setManualForm((prev) => ({
                                              ...prev,
                                              addMode: e.target.value
                                          }))}/> 기존 식단에 추가</label>
                        </div>
                        {manualForm.addMode === 'existing' && canUseExistingDiet ?
                            <label className="dietFormLabel">추가할 식단 선택<select className="dietFormInput"
                                                                              value={manualForm.targetDietId}
                                                                              onChange={(e) => setManualForm((prev) => ({
                                                                                  ...prev,
                                                                                  targetDietId: e.target.value
                                                                              }))} required>{diets.map((diet) => <option
                                key={diet.id} value={diet.id}>{diet.title}</option>)}</select></label> : null}
                    </form>
                </ModalShell>
            ) : null}

            {isFavoritesModalOpen ? (
                <ModalShell
                    titleId="favorites-modal-title"
                    title="즐겨찾기 식단 목록"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeFavoritesModal}>취소
                        </button>
                    </div>}
                >
                    <label className="dietFormLabel">새 식단 제목<input className="dietFormInput" value={favoritesTitle}
                                                                   onChange={(e) => setFavoritesTitle(e.target.value)}/></label>
                    {favoriteDiets.length === 0 ? <p className="dietUploadModalDescription">아직 즐겨찾기한 식단이 없습니다.</p> : (
                        <div className="dietFavoriteList">
                            {favoriteDiets.map((diet) => (
                                <div key={diet.id} className="dietFavoriteItem">
                                    <span className="dietFavoriteItemTitle">{diet.title}</span>
                                    <span
                                        className="dietFavoriteItemMeta">{diet.calories} kcal · 단백질 {diet.protein}g</span>
                                    <div className="dietFavoriteItemActions">
                                        <button type="button" className="foodCardActionButton"
                                                onClick={() => handleAddFavoriteDiet(diet)}>새 식단으로 추가
                                        </button>
                                        <button type="button"
                                                className="foodCardActionButton foodCardActionButtonDanger"
                                                onClick={() => handleRemoveFavoriteInModal(diet.id)}>즐겨찾기 해제
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ModalShell>
            ) : null}

            {isAiEditModalOpen ? (
                <ModalShell
                    titleId="ai-edit-modal-title"
                    title="AI 분석 음식 수정"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeAiEditModal}>취소</button>
                        <button type="submit" form="ai-edit-form" className="dietUploadSubmitButton">수정 반영</button>
                    </div>}
                >
                    <form id="ai-edit-form" className="dietInlineForm" onSubmit={handleAiEditSubmit}>
                        <div className="dietItemActionRow">
                            <button type="button" className="dietUploadSelectButton" onClick={handleAiEditAddItem}>음식
                                추가
                            </button>
                            <button type="button" className="dietUploadCancelButton" onClick={handleAiEditDeleteItem}
                                    disabled={aiEditForm.items.length === 0}>선택 음식 삭제
                            </button>
                        </div>
                        <label className="dietFormLabel">수정할 음식<select className="dietFormInput"
                                                                       value={aiEditForm.itemId || ''}
                                                                       onChange={(e) => handleAiEditSelectItem(e.target.value)}>{aiEditForm.items.map((item) =>
                            <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        {selectedAiItem ? (
                            <>
                                <label className="dietFormLabel">음식 이름<input className="dietFormInput"
                                                                             value={selectedAiItem.name}
                                                                             onChange={(e) => handleAiEditFieldChange('name', e.target.value)}
                                                                             required/></label>
                                <div className="dietFormGrid">
                                    <label className="dietFormLabel">칼로리<input className="dietFormInput" type="number"
                                                                               min="0" value={selectedAiItem.calories}
                                                                               onChange={(e) => handleAiEditFieldChange('calories', e.target.value)}
                                                                               required/></label>
                                    <label className="dietFormLabel">단백질(g)<input className="dietFormInput"
                                                                                  type="number" min="0"
                                                                                  value={selectedAiItem.protein}
                                                                                  onChange={(e) => handleAiEditFieldChange('protein', e.target.value)}
                                                                                  required/></label>
                                    <label className="dietFormLabel">탄수화물(g)<input className="dietFormInput"
                                                                                   type="number" min="0"
                                                                                   value={selectedAiItem.carbs}
                                                                                   onChange={(e) => handleAiEditFieldChange('carbs', e.target.value)}
                                                                                   required/></label>
                                    <label className="dietFormLabel">지방(g)<input className="dietFormInput" type="number"
                                                                                 min="0" value={selectedAiItem.fat}
                                                                                 onChange={(e) => handleAiEditFieldChange('fat', e.target.value)}
                                                                                 required/></label>
                                </div>
                            </>
                        ) : null}
                    </form>
                </ModalShell>
            ) : null}

            {isAiSaveModalOpen ? (
                <ModalShell
                    titleId="ai-save-modal-title"
                    title="AI 분석 결과 저장"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeAiSaveModal}>취소</button>
                        <button type="button" className="dietUploadSubmitButton" onClick={handleConfirmAiSave}>저장
                        </button>
                    </div>}
                >
                    <div className="dietFormRadioRow">
                        <label><input type="radio" name="ai-save-mode" value="new"
                                      checked={aiSaveForm.addMode === 'new'} onChange={(e) => setAiSaveForm((prev) => ({
                            ...prev,
                            addMode: e.target.value
                        }))}/> 새 식단으로 저장</label>
                        <label><input type="radio" name="ai-save-mode" value="existing"
                                      disabled={!canUseExistingDiet}
                                      checked={aiSaveForm.addMode === 'existing'}
                                      onChange={(e) => setAiSaveForm((prev) => ({
                                          ...prev,
                                          addMode: e.target.value
                                      }))}/> 기존 식단에 추가</label>
                    </div>
                    {aiSaveForm.addMode === 'new' ?
                        <label className="dietFormLabel">식단 제목<input className="dietFormInput" value={aiSaveForm.title}
                                                                     onChange={(e) => setAiSaveForm((prev) => ({
                                                                         ...prev,
                                                                         title: e.target.value
                                                                     }))}/></label> : null}
                    {aiSaveForm.addMode === 'existing' && canUseExistingDiet ?
                        <label className="dietFormLabel">추가할 식단 선택<select className="dietFormInput"
                                                                          value={aiSaveForm.targetDietId}
                                                                          onChange={(e) => setAiSaveForm((prev) => ({
                                                                              ...prev,
                                                                              targetDietId: e.target.value
                                                                          }))} required>{diets.map((diet) => <option
                            key={diet.id} value={diet.id}>{diet.title}</option>)}</select></label> : null}
                </ModalShell>
            ) : null}

            {isGoalModalOpen ? (
                <ModalShell
                    titleId="goal-modal-title"
                    title="오늘의 영양 목표 변경"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeGoalModal}>취소</button>
                        <button type="button" className="dietUploadSubmitButton"
                                onClick={() => handleSaveGoals(goalForm)} disabled={isSavingGoals}>저장
                        </button>
                    </div>}
                >
                    <div className="dietInlineForm">
                        <div className="dietFormGrid">
                            <label className="dietFormLabel">칼로리<input className="dietFormInput" type="number" min="1"
                                                                       value={goalForm.calories}
                                                                       onChange={(e) => handleGoalInput('calories', e.target.value)}/></label>
                            <label className="dietFormLabel">단백질(g)<input className="dietFormInput" type="number"
                                                                          min="0" value={goalForm.protein}
                                                                          onChange={(e) => handleGoalInput('protein', e.target.value)}/></label>
                            <label className="dietFormLabel">탄수화물(g)<input className="dietFormInput" type="number"
                                                                           min="0" value={goalForm.carbs}
                                                                           onChange={(e) => handleGoalInput('carbs', e.target.value)}/></label>
                            <label className="dietFormLabel">지방(g)<input className="dietFormInput" type="number" min="0"
                                                                         value={goalForm.fat}
                                                                         onChange={(e) => handleGoalInput('fat', e.target.value)}/></label>
                        </div>
                    </div>
                </ModalShell>
            ) : null}

            {isDietEditModalOpen ? (
                <ModalShell
                    titleId="diet-edit-modal-title"
                    title="식단/음식 수정"
                    actions={<div className="dietUploadActions">
                        <button type="button" className="dietUploadCancelButton" onClick={closeDietEditModal}>취소
                        </button>
                        <button type="submit" form="diet-edit-form" className="dietUploadSubmitButton">저장</button>
                    </div>}
                >
                    <form id="diet-edit-form" className="dietInlineForm" onSubmit={handleDietEditSubmit}>
                        <label className="dietFormLabel">식단 제목<input className="dietFormInput"
                                                                     value={dietEditForm.title}
                                                                     onChange={(e) => setDietEditForm((prev) => ({
                                                                         ...prev,
                                                                         title: e.target.value
                                                                     }))} required/></label>
                        <div className="dietItemActionRow">
                            <button type="button" className="dietUploadSelectButton" onClick={handleDietEditAddItem}>음식
                                추가
                            </button>
                            <button type="button" className="dietUploadCancelButton" onClick={handleDietEditDeleteItem}
                                    disabled={dietEditForm.items.length === 0}>선택 음식 삭제
                            </button>
                        </div>
                        <label className="dietFormLabel">수정할 음식<select className="dietFormInput"
                                                                       value={dietEditForm.itemId || ''}
                                                                       onChange={(e) => handleDietEditSelectItem(e.target.value)}>{dietEditForm.items.map((item) =>
                            <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        {selectedDietItem ? (
                            <>
                                <label className="dietFormLabel">음식 이름<input className="dietFormInput"
                                                                             value={selectedDietItem.name}
                                                                             onChange={(e) => handleDietEditFieldChange('name', e.target.value)}
                                                                             required/></label>
                                <div className="dietFormGrid">
                                    <label className="dietFormLabel">칼로리<input className="dietFormInput" type="number"
                                                                               min="0" value={selectedDietItem.calories}
                                                                               onChange={(e) => handleDietEditFieldChange('calories', e.target.value)}
                                                                               required/></label>
                                    <label className="dietFormLabel">단백질(g)<input className="dietFormInput"
                                                                                  type="number" min="0"
                                                                                  value={selectedDietItem.protein}
                                                                                  onChange={(e) => handleDietEditFieldChange('protein', e.target.value)}
                                                                                  required/></label>
                                    <label className="dietFormLabel">탄수화물(g)<input className="dietFormInput"
                                                                                   type="number" min="0"
                                                                                   value={selectedDietItem.carbs}
                                                                                   onChange={(e) => handleDietEditFieldChange('carbs', e.target.value)}
                                                                                   required/></label>
                                    <label className="dietFormLabel">지방(g)<input className="dietFormInput" type="number"
                                                                                 min="0" value={selectedDietItem.fat}
                                                                                 onChange={(e) => handleDietEditFieldChange('fat', e.target.value)}
                                                                                 required/></label>
                                </div>
                            </>
                        ) : null}
                    </form>
                </ModalShell>
            ) : null}
        </>
    );
}

export default DietPage;

