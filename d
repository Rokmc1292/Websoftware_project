[33mcommit a2b91873f7525760e5c2b289e343796754dbe6cb[m[33m ([m[1;36mHEAD -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m)[m
Merge: 672a123 ee7a5e8
Author: sipsam1 <32975682+Sipsam@users.noreply.github.com>
Date:   Wed Apr 15 01:27:17 2026 +0900

    Merge pull request #3 from Rokmc1292/integrate/main-2026-04-14
    
    - unify social auth with social_identities schema model
    - implement hybrid social callback code exchange flow
    - enforce social-only account policy for password/delete flows
    - consolidate signup into /login?mode=signup and remove /signup route
    - remove unused auth pages/files (SignupPage, AuthPage.css)
    - standardize global theme tokens and add quick theme toggles
    - improve login page theme consistency and dark-mode behavior
    - improve diet image analysis UX (multipart handling, timeout, progress)

[33mcommit ee7a5e8c5668f8006807db5d3083433f668acbfd[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Wed Apr 15 01:19:47 2026 +0900

    feat: unify social auth flow, theme updates, and auth page cleanup

[33mcommit ce6d9b1b65611f62abbc1ae68e3d70970aedc017[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 21:05:39 2026 +0900

    refactor: centralize env loading via root .env
    
    - keep README.md deletion as requested
    
    - load environment variables only from root .env in config
    
    - route AI service settings through Config/current_app.config
    
    - remove direct os.getenv usage from AI service modules

[33mcommit cdedc8c47b50871d6f06162fa98f5e55cc7e02b0[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 20:42:13 2026 +0900

    chore: normalize AI env prefixes by team area
    
    - move workout and stats AI settings to TAE_ prefixed env keys
    
    - move sleep and intro related AI settings to GIL_ prefixed env keys
    
    - move diet and mypage related AI settings to SUNG_ prefixed env keys
    
    - update README env docs and troubleshooting to match the new naming

[33mcommit cd967493702ab64d07ba1911705b3ec90d27e656[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 20:23:09 2026 +0900

    fix: harden JWT identity handling and isolate sleep stats by user
    
    - unify user id parsing across auth/diet/profile/sleep/stats/workout/fitbit routes
    
    - prevent cross-user sleep data leakage in stats monthly/daily queries
    
    - clean stale stats comments to match current schema
    
    - restore visible header brand text

[33mcommit 2fb72ca50df27b67fe271489323c5d7d14e39e03[m
Merge: fe67768 f24ca55
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 20:11:26 2026 +0900

    merge: resolve conflicts while integrating origin/sungwon into integrate/main-2026-04-14

[33mcommit fe67768350c921004c29086c7463f227fcc01543[m
Merge: 31f54d2 510f19b
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 20:03:49 2026 +0900

    Merge remote-tracking branch 'origin/gil' into integrate/main-2026-04-14
    
    Changes to be committed:
            modified:   backend/app/__init__.py
            modified:   backend/app/config.py
            modified:   backend/app/models/__init__.py
            new file:   backend/app/models/fitbit_token.py
            modified:   backend/app/models/sleep_record.py
            new file:   backend/app/routes/fitbit.py
            modified:   backend/app/routes/sleep.py
            modified:   database/schema.sql
            modified:   frontend/src/App.jsx
            new file:   frontend/src/api/sleepApi.js
            new file:   frontend/src/api/wearableApi.js
            new file:   frontend/src/pages/intro/IntroPage.css
            new file:   frontend/src/pages/intro/IntroPage.jsx
            new file:   frontend/src/pages/sleep/SleepPage.css
            modified:   frontend/src/pages/sleep/SleepPage.jsx

[33mcommit 31f54d2c276dd48c49e7fa3725870ccf8ec7a95e[m
Merge: 672a123 38309ae
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 19:53:41 2026 +0900

    Merge remote-tracking branch 'origin/taewook' into integrate/main-2026-04-14

[33mcommit f24ca555302ae2a1fa5e97163daa073f16a81974[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 19:42:04 2026 +0900

    fix: synchronize missing columns in user_profiles
    
    Changes to be committed:
            modified:   backend/app/__init__.py

[33mcommit de5058988f6195ac23570642f1ec8262cf9f41ec[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 01:11:43 2026 +0900

    docs(readme): add comprehensive project guide and API spec; fix auth 401 redirect guard
    
    - add README with overview, planning/spec, feature docs, API spec, DB notes, and setup guide
    - refine response interceptor guard to avoid unnecessary redirect behavior on auth-related 401 cases
    
    ---
    
    Changes to be committed:
            new file:   README.md
            modified:   frontend/src/api/authApi.js

[33mcommit 07540f6c278c465d52dcb5bc0407302ae0d1fa6a[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Apr 14 00:45:49 2026 +0900

    feat(profile): add mypage profile feature and integrate related app flows
    
    - add profile domain files: app/models/profile.py, app/routes/profile.py
    - add MyPage UI: frontend/src/pages/mypage/MyPage.jsx and MyPage.css
    - wire profile feature into app bootstrap and user/auth API flow
    - update user/auth/sleep routes and related frontend header/app integration
    - update diet service/page logic and sync DB schema changes
    
    ---
    
    Changes to be committed:
            modified:   backend/app/__init__.py
            new file:   backend/app/models/profile.py
            modified:   backend/app/models/user.py
            modified:   backend/app/routes/auth.py
            modified:   backend/app/routes/diet.py
            new file:   backend/app/routes/profile.py
            modified:   backend/app/routes/sleep.py
            modified:   backend/app/services/ai_coach.py
            renamed:    backend/app/services/diet_coat_service.py -> backend/app/services/diet_coach_service.py
            modified:   database/schema.sql
            modified:   frontend/src/App.jsx
            modified:   frontend/src/api/authApi.js
            modified:   frontend/src/components/Header.jsx
            modified:   frontend/src/pages/diet/DietPage.jsx
            new file:   frontend/src/pages/mypage/MyPage.css
            new file:   frontend/src/pages/mypage/MyPage.jsx

[33mcommit ee7b647ab711d6b722b71f4cc2e2776a311a87d3[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Mon Apr 13 22:46:43 2026 +0900

    feat(diet): refine AI coach and date handling
    
    - add Google AI image analysis and coach feedback flow
    - keep coach result stable across date changes
    - show analysis date/time and reanalysis badge
    - allow favorties to be managed across all dates
    
    ---
    
    Changes to be committed:
            modified:   backend/app/routes/diet.py
            new file:   backend/app/services/diet_coat_service.py
            modified:   backend/requirements.txt
            modified:   frontend/src/api/dietApi.js
            modified:   frontend/src/pages/diet/DietPage.css
            modified:   frontend/src/pages/diet/DietPage.jsx

[33mcommit 510f19b60471ded07f83d87570ece39d75b5fded[m[33m ([m[1;31morigin/gil[m[33m, [m[1;32mgil[m[33m)[m
Author: gildonghyeon <gdh0407@naver.com>
Date:   Mon Apr 13 21:59:36 2026 +0900

    인트로페이지 추가

[33mcommit 38309ae1ccb7381d8a219c99716a9d403d4f70d7[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Wed Apr 8 11:26:12 2026 +0900

    통계분석페이지

[33mcommit c41d3a7596839a4c58c3040269c224b3ca74cbc7[m
Author: gildonghyeon <gdh0407@naver.com>
Date:   Mon Apr 6 23:24:03 2026 +0900

    fitbit연동

[33mcommit 675ec5e324ff45b2d78afc4e575ce4de0a9eb7aa[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Thu Apr 2 20:56:42 2026 +0900

    2.2 즐겨찾기 오류수정 불러오기 기능 추가

[33mcommit e32a87cef5e0eed99e3ff45b1b06475c1a2eeb7d[m[33m ([m[1;32mmaster[m[33m)[m
Author: gildonghyeon <gdh0407@naver.com>
Date:   Thu Apr 2 01:13:36 2026 +0900

    기초에서수정

[33mcommit 445a235075b064f67a686f979f6640ef589bcadf[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Wed Apr 1 09:47:22 2026 +0900

    2.1 필요기능
    운동루틴 수정기능
    전의 최고중량,최고reps보다 + -- 기능
    루틴 즐겨찾기, 불러오기 기능
    루틴을 직접입력할경우 한번이라도 했던 운동은 자동완성하는 기능
    카드 최소화했다가 클릭하면 상세정보나오게
    여러개있으면 페이지네이션 및 검색기능(검색어, 부위별- 부위별 검색은 저장된거에서 부위를 검색해야함 그래서 운동루틴 저장할때 부위별로 저장할수있게 해야함, 월별 검색)
    
    수정사항
    중량,횟수 칸 위치가 텍스트랑 딱 맞게 이동
    루틴작성했을때 종목들 가나다순이 아닌 작성순서로 정렬
    맨몸운동처럼 중량이 0일경우 작성했을떄 0이 안뜨게 수정

[33mcommit 672a123906d54faf17150f82f9e327a9ca410e41[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Mar 31 20:45:13 2026 +0900

    fix schema.sql

[33mcommit e0ba3c96ae4b1f90ea2f0c3b84322e818f50fcac[m
Merge: febdece 4dc09cf
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Tue Mar 31 19:51:31 2026 +0900

    Merge pull request #1 from Rokmc1292/ds
    
    Ds

[33mcommit 4dc09cfb4baf3748da45ba9e637b0364f2ff1246[m
Merge: 018bd09 f6e8de9
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Mar 31 19:31:30 2026 +0900

    merge sungwon and DH 2

[33mcommit f6e8de9380b35ea50333210287fd7bbd21e2e3ef[m
Author: 길동현 <gdh0407@naver.com>
Date:   Tue Mar 31 19:27:42 2026 +0900

    commit

[33mcommit 018bd091e00cf5f82302eb42db99e35e46c2ce10[m
Merge: ea42d20 847f9cd
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Mar 31 19:23:06 2026 +0900

    merge sungwon and DH

[33mcommit ea42d20721c4c70cb5e2878267844b4c9a4c2d09[m
Author: 길동현 <gdh0407@naver.com>
Date:   Tue Mar 31 19:13:22 2026 +0900

    commit

[33mcommit 847f9cd4f4e281268ceb269d8aa75a87a826d3b4[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Mar 31 18:14:35 2026 +0900

    1.3 untracked 파일 수정

[33mcommit 53fb5a65875501bf2e9a125d0ab7727d0ccb03c6[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Mar 31 18:11:43 2026 +0900

    1.2 식단관리 초기

[33mcommit 74e41e8327032401591ea43e663107db4428e264[m
Author: Sipsam <26bepulwon@gmail.com>
Date:   Tue Mar 31 18:08:45 2026 +0900

    1.1 식단관리 초기

[33mcommit febdece723fbd01f4fce0f3a1d7e9b77f7d05295[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Mon Mar 30 21:24:37 2026 +0900

    1.5(운동루틴페이지 초기)

[33mcommit c319808664e787993374626f4649b203e32ee184[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Thu Mar 26 23:55:15 2026 +0900

    1.4(로고삽입)

[33mcommit aedbd3266f5d9ece6e01f6f34bf6c59b3ef60fc3[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Wed Mar 25 09:22:40 2026 +0900

    1.3(로그인페이지디자인)

[33mcommit f6ae77b9240de08b80f2865a884c886a2e4c3334[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Sat Mar 21 01:14:19 2026 +0900

    1.2(db연결 및 로그인&회원가입 기능완료)

[33mcommit 1a41db26071ac59396c41e27a8863ace0975401e[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Fri Mar 20 02:46:08 2026 +0900

    1.1(백엔드초기)

[33mcommit 26909dd84a3707c103c38ad803b76650a24d9fdb[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Fri Mar 20 01:56:10 2026 +0900

    1.0(프론트엔드 초기)

[33mcommit 0aaefe14d190701c510688a67039980af3397fe1[m
Author: Rokmc1292 <rokmcqud1292rl@gmail.com>
Date:   Sat Mar 14 01:35:13 2026 +0900

    first commit
