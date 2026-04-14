import {useEffect, useState} from 'react';
import {changePassword, deleteAccount, getCurrentUser, updateProfile} from '../../api/authApi.js';
import './MyPage.css';

const MENU_ITEMS = [
    {id: 'profile', label: '닉네임 변경'},
    {id: 'password', label: '비밀번호 변경'},
    {id: 'note', label: '개인 맞춤 정보'},
    {id: 'delete', label: '계정 삭제'},
];

const createProfileForm = (user = null) => ({
    username: user?.username || '',
    profile_note: user?.profile_note || '',
    height_cm: user?.height_cm ?? '',
    weight_kg: user?.weight_kg ?? '',
    skeletal_muscle_kg: user?.skeletal_muscle_kg ?? '',
    body_fat_kg: user?.body_fat_kg ?? '',
});

const createPasswordForm = () => ({
    current_password: '',
    new_password: '',
    confirm_password: '',
});

const createDeleteForm = () => ({
    username: '',
    email: '',
    current_password: '',
});

function MyPage() {
    const [activeMenu, setActiveMenu] = useState('profile');
    const [currentUser, setCurrentUser] = useState(null);
    const [profileForm, setProfileForm] = useState(createProfileForm());
    const [passwordForm, setPasswordForm] = useState(createPasswordForm());
    const [deleteForm, setDeleteForm] = useState(createDeleteForm());
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [message, setMessage] = useState({type: '', text: ''});

    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                setIsLoading(true);
                const data = await getCurrentUser();
                const user = data?.user || null;
                setCurrentUser(user);
                setProfileForm(createProfileForm(user));
            } catch (error) {
                setMessage({type: 'error', text: error?.response?.data?.message || '사용자 정보를 불러오지 못했습니다.'});
            } finally {
                setIsLoading(false);
            }
        };
        loadCurrentUser();
    }, []);

    const showMessage = (type, text) => setMessage({type, text});

    const openDeleteModal = () => {
        setDeleteForm(createDeleteForm());
        setDeleteStep(1);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (isDeletingAccount) return;
        setIsDeleteModalOpen(false);
        setDeleteStep(1);
        setDeleteForm(createDeleteForm());
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        if (!profileForm.username.trim()) {
            showMessage('error', '닉네임을 입력해주세요.');
            return;
        }
        if (profileForm.profile_note.length > 150) {
            showMessage('error', '개인 맞춤 정보는 최대 150자까지 입력할 수 있습니다.');
            return;
        }
        try {
            setIsSavingProfile(true);
            const response = await updateProfile({
                username: profileForm.username.trim(),
                profile_note: profileForm.profile_note.trim(),
                height_cm: profileForm.height_cm,
                weight_kg: profileForm.weight_kg,
                skeletal_muscle_kg: profileForm.skeletal_muscle_kg,
                body_fat_kg: profileForm.body_fat_kg,
            });
            const user = response?.user || null;
            if (user) {
                setCurrentUser(user);
                setProfileForm(createProfileForm(user));
            }
            showMessage('success', response?.message || '닉네임이 변경되었습니다.');
        } catch (error) {
            showMessage('error', error?.response?.data?.message || '닉네임 변경에 실패했습니다.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            showMessage('error', '비밀번호 변경 정보를 모두 입력해주세요.');
            return;
        }
        try {
            setIsSavingPassword(true);
            const response = await changePassword(passwordForm);
            setPasswordForm(createPasswordForm());
            showMessage('success', response?.message || '비밀번호가 변경되었습니다.');
        } catch (error) {
            showMessage('error', error?.response?.data?.message || '비밀번호 변경에 실패했습니다.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleDeleteAccount = async (event) => {
        event.preventDefault();
        if (!deleteForm.username || !deleteForm.email || !deleteForm.current_password) {
            showMessage('error', '닉네임, 이메일, 비밀번호를 모두 입력해주세요.');
            return;
        }
        try {
            setIsDeletingAccount(true);
            const response = await deleteAccount(deleteForm);
            showMessage('success', response?.message || '계정이 삭제되었습니다.');
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        } catch (error) {
            showMessage('error', error?.response?.data?.message || '계정 삭제에 실패했습니다.');
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="myPageEmptyState">사용자 정보를 불러오는 중입니다...</div>;
        }

        if (activeMenu === 'profile') {
            return (
                <form className="myPageForm" onSubmit={handleProfileSubmit}>
                    <div className="myPageSectionHeader">
                        <h3 className="myPageSectionTitle">닉네임 변경</h3>
                        <p className="myPageSectionDesc">닉네임을 변경할 수 있습니다.</p>
                    </div>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">닉네임</span>
                        <input
                            className="myPageInput"
                            value={profileForm.username}
                            onChange={(e) => setProfileForm((prev) => ({...prev, username: e.target.value}))}
                            placeholder="닉네임 입력"
                            maxLength={50}
                            required
                        />
                    </label>
                    <div className="myPageFormActions">
                        <button className="myPagePrimaryButton" type="submit" disabled={isSavingProfile}>
                            {isSavingProfile ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            );
        }

        if (activeMenu === 'password') {
            return (
                <form className="myPageForm" onSubmit={handlePasswordSubmit}>
                    <div className="myPageSectionHeader">
                        <h3 className="myPageSectionTitle">비밀번호 변경</h3>
                        <p className="myPageSectionDesc">현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
                    </div>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">현재 비밀번호</span>
                        <input
                            className="myPageInput"
                            type="password"
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm((prev) => ({...prev, current_password: e.target.value}))}
                            placeholder="현재 비밀번호"
                            autoComplete="current-password"
                            required
                        />
                    </label>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">새 비밀번호</span>
                        <input
                            className="myPageInput"
                            type="password"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm((prev) => ({...prev, new_password: e.target.value}))}
                            placeholder="새 비밀번호"
                            autoComplete="new-password"
                            required
                        />
                    </label>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">새 비밀번호 확인</span>
                        <input
                            className="myPageInput"
                            type="password"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm((prev) => ({...prev, confirm_password: e.target.value}))}
                            placeholder="새 비밀번호 확인"
                            autoComplete="new-password"
                            required
                        />
                    </label>
                    <div className="myPageFormActions">
                        <button className="myPagePrimaryButton" type="submit" disabled={isSavingPassword}>
                            {isSavingPassword ? '변경 중...' : '변경'}
                        </button>
                    </div>
                </form>
            );
        }

        if (activeMenu === 'note') return (
            <form className="myPageForm" onSubmit={handleProfileSubmit}>
                <div className="myPageSectionHeader">
                    <h3 className="myPageSectionTitle">개인 맞춤 정보</h3>
                    <p className="myPageSectionDesc">식단 AI 코치가 참고할 메모를 작성하세요. 최대 150자까지 입력 가능합니다.</p>
                </div>
                <label className="myPageField">
                    <span className="myPageFieldLabel">개인 맞춤 정보</span>
                    <textarea
                        className="myPageTextarea"
                        rows="5"
                        value={profileForm.profile_note}
                        onChange={(e) => setProfileForm((prev) => ({
                            ...prev,
                            profile_note: e.target.value.slice(0, 150)
                        }))}
                        maxLength={150}
                        placeholder="예: 점심은 회사 식당 위주, 저녁은 가볍게, 매운 음식은 자주 피함"
                    />
                </label>
                <div className="myPageFieldGrid">
                    <label className="myPageField">
                        <span className="myPageFieldLabel">키(cm)</span>
                        <input
                            className="myPageInput"
                            type="number"
                            step="0.1"
                            min="0"
                            value={profileForm.height_cm}
                            onChange={(e) => setProfileForm((prev) => ({...prev, height_cm: e.target.value}))}
                            placeholder="예: 172.5"
                        />
                    </label>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">체중(kg)</span>
                        <input
                            className="myPageInput"
                            type="number"
                            step="0.1"
                            min="0"
                            value={profileForm.weight_kg}
                            onChange={(e) => setProfileForm((prev) => ({...prev, weight_kg: e.target.value}))}
                            placeholder="예: 68.2"
                        />
                    </label>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">골격근량(kg)</span>
                        <input
                            className="myPageInput"
                            type="number"
                            step="0.1"
                            min="0"
                            value={profileForm.skeletal_muscle_kg}
                            onChange={(e) => setProfileForm((prev) => ({...prev, skeletal_muscle_kg: e.target.value}))}
                            placeholder="예: 29.4"
                        />
                    </label>
                    <label className="myPageField">
                        <span className="myPageFieldLabel">체지방량(kg)</span>
                        <input
                            className="myPageInput"
                            type="number"
                            step="0.1"
                            min="0"
                            value={profileForm.body_fat_kg}
                            onChange={(e) => setProfileForm((prev) => ({...prev, body_fat_kg: e.target.value}))}
                            placeholder="예: 12.8"
                        />
                    </label>
                </div>
                <div className="myPageCharCount">{profileForm.profile_note.length} / 150자</div>
                <div className="myPageFormActions">
                    <button className="myPagePrimaryButton" type="submit" disabled={isSavingProfile}>
                        {isSavingProfile ? '저장 중...' : '저장'}
                    </button>
                </div>
            </form>
        );

        return (
            <div className="myPageForm">
                <div className="myPageSectionHeader">
                    <h3 className="myPageSectionTitle myPageDangerTitle">계정 삭제</h3>
                    <p className="myPageSectionDesc">2단계 확인 모달에서 삭제 영향 확인 후 비밀번호 검증을 거쳐 계정을 삭제합니다.</p>
                </div>
                <div className="myPageImpactCard">
                    <h4 className="myPageImpactTitle">삭제 전 영향 안내</h4>
                    <p className="myPageImpactItem">- 계정 및 프로필 정보가 삭제됩니다.</p>
                    <p className="myPageImpactItem">- 운동/식단 데이터는 계정과 함께 삭제됩니다.</p>
                    <p className="myPageImpactItem">- 수면 데이터는 현재 정책상 사용자 연동 개선 전까지 완전 보장을 안내합니다.</p>
                    <p className="myPageImpactItem">- 삭제 후 복구할 수 없습니다.</p>
                </div>
                <div className="myPageFormActions">
                    <button className="myPageDangerButton" type="button" onClick={openDeleteModal}>
                        계정 삭제 진행
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="myPageContainer">
            <section className="myPageMainCard">
                <div className="myPageHeader">
                    <div>
                        <h2 className="myPageTitle">마이페이지</h2>
                        <p className="myPageSubtitle">계정과 개인 맞춤 정보를 한 곳에서 관리하세요.</p>
                    </div>
                </div>

                {message.text ? <div
                    className={`myPageMessage ${message.type === 'success' ? 'isSuccess' : 'isError'}`}>{message.text}</div> : null}

                <div className="myPageLayout">
                    <aside className="myPageMenuCard">
                        <div className="myPageMenuTitle">메뉴 선택</div>
                        <div className="myPageMenuList">
                            {MENU_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`myPageMenuButton${activeMenu === item.id ? ' isActive' : ''}`}
                                    onClick={() => setActiveMenu(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </aside>

                    <div className="myPageContentArea">
                        {currentUser ? (
                            <div className="myPageProfileCard">
                                <div className="myPageProfileName">{currentUser.username}</div>
                                <div className="myPageProfileMeta">{currentUser.email}</div>
                            </div>
                        ) : null}
                        {renderContent()}
                    </div>
                </div>
            </section>

            {isDeleteModalOpen ? (
                <div className="myPageModalOverlay" role="presentation">
                    <div className="myPageModal" role="dialog" aria-modal="true"
                         aria-labelledby="delete-account-modal-title">
                        <div className="myPageModalHeader">
                            <h3 id="delete-account-modal-title" className="myPageModalTitle">계정 삭제 확인</h3>
                        </div>

                        {deleteStep === 1 ? (
                            <div className="myPageModalBody">
                                <div className="myPageImpactCard">
                                    <h4 className="myPageImpactTitle">1단계: 삭제 영향 확인</h4>
                                    <p className="myPageImpactItem">- 삭제 후 계정 복구는 불가능합니다.</p>
                                    <p className="myPageImpactItem">- 운동/식단 기록은 삭제됩니다.</p>
                                    <p className="myPageImpactItem">- 수면 데이터는 현재 정책 안내를 확인해 주세요.</p>
                                </div>
                            </div>
                        ) : (
                            <form className="myPageModalBody" onSubmit={handleDeleteAccount}>
                                <div className="myPageSectionDesc">2단계: 현재 닉네임/이메일/비밀번호를 입력하세요.</div>
                                <label className="myPageField">
                                    <span className="myPageFieldLabel">현재 닉네임</span>
                                    <input
                                        className="myPageInput"
                                        value={deleteForm.username}
                                        onChange={(e) => setDeleteForm((prev) => ({
                                            ...prev,
                                            username: e.target.value
                                        }))}
                                        placeholder="현재 닉네임"
                                        required
                                    />
                                </label>
                                <label className="myPageField">
                                    <span className="myPageFieldLabel">현재 이메일</span>
                                    <input
                                        className="myPageInput"
                                        type="email"
                                        value={deleteForm.email}
                                        onChange={(e) => setDeleteForm((prev) => ({
                                            ...prev,
                                            email: e.target.value
                                        }))}
                                        placeholder="현재 이메일"
                                        autoComplete="email"
                                        required
                                    />
                                </label>
                                <label className="myPageField">
                                    <span className="myPageFieldLabel">현재 비밀번호</span>
                                    <input
                                        className="myPageInput"
                                        type="password"
                                        value={deleteForm.current_password}
                                        onChange={(e) => setDeleteForm((prev) => ({
                                            ...prev,
                                            current_password: e.target.value
                                        }))}
                                        placeholder="현재 비밀번호"
                                        autoComplete="current-password"
                                        required
                                    />
                                </label>
                                <div className="myPageModalActions">
                                    <button type="button" className="myPageGhostButton" onClick={closeDeleteModal}
                                            disabled={isDeletingAccount}>취소
                                    </button>
                                    <button className="myPageDangerButton" type="submit" disabled={isDeletingAccount}>
                                        {isDeletingAccount ? '삭제 중...' : '계정 삭제'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {deleteStep === 1 ? (
                            <div className="myPageModalActions">
                                <button type="button" className="myPageGhostButton" onClick={closeDeleteModal}>취소
                                </button>
                                <button type="button" className="myPageDangerButton"
                                        onClick={() => setDeleteStep(2)}>다음
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default MyPage;



