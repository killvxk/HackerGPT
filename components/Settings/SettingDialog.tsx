import { IconX } from '@tabler/icons-react';
import { FC, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';

import { Settings } from '@/types/settings';

import HomeContext from '@/pages/api/home/home.context';

import { getAuth } from 'firebase/auth';
import { initFirebaseApp } from "@/utils/server/firebase-client-init";

import {getPremiumStatus} from "@/components/Payments/getPremiumStatus";
import {getPortalUrl} from "@/components/Payments/stripePayments"

import { useLogOut } from '@/components/Authorization/LogOutButton';
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
  const { dispatch: homeDispatch } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const { isUserLoggedIn, handleLogOut } = useLogOut();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [preFetchedPortalUrl, setPreFetchedPortalUrl] = useState<string | null>(null);
  const app = initFirebaseApp();
  const auth = getAuth(app);

  const checkPremiumAndPortal = async () => {
    const newPremiumStatus = auth.currentUser ? await getPremiumStatus(app) : false;
    setIsPremium(newPremiumStatus);
    if (newPremiumStatus && isUserLoggedIn) {
      try {
        const portalUrl = await getPortalUrl(app);
        setPreFetchedPortalUrl(portalUrl);
      } catch (error) {
        console.error('Error pre-fetching portal URL:', error);
      }
    }
  };

  useEffect(() => {
    checkPremiumAndPortal();
  }, [app, auth.currentUser?.uid, isUserLoggedIn]);

  const manageSubscription = () => {
    if (preFetchedPortalUrl) {
      router.push(preFetchedPortalUrl);
    } else {
      (async () => {
        try {
          const portalUrl = await getPortalUrl(app);
          router.push(portalUrl);
        } catch (error) {
          console.error('Error fetching portal URL:', error);
        }
      })();
    }
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    saveSettings(state);
  }, [state.theme]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 inset-negative-5">
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />
          <div
            ref={modalRef}
            className="dark:border-neutral-400 inline-block max-h-[400px] max-h-[80%] w-11/12 transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
          <div 
            className="absolute top-0 right-0 mt-2 mr-2 cursor-pointer w-10 h-10 flex items-center justify-center"
            onClick={onClose}
          >
            <IconX color="gray" size={22} strokeWidth={2} />
          </div>
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
              {t('Settings')}
            </div>

            <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
              {t('Theme')}
            </div>

            <select
              className="w-full cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200"
              value={state.theme}
              onChange={(event) =>
                dispatch({ field: 'theme', value: event.target.value })
              }
            >
              <option value="dark">{t('Dark mode')}</option>
              <option value="light">{t('Light mode')}</option>
            </select>
            {isPremium && isUserLoggedIn && (
              <button 
                  type="button"
                  className="w-full px-4 py-2 mt-6 border rounded-lg shadow bg-white dark:bg-[#202123] text-black dark:text-white border border-gray-300 hover:bg-[#dddddd] dark:hover:bg-[#343541]"
                  onClick={manageSubscription}
              >
                  <span>Manage Subscription</span>
              </button>
            )}
            {
              isUserLoggedIn ? (
                <>
                  <button 
                      type="button"
                      className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-red-700 text-white hover:bg-red-500 bg-red-600 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-red-700 dark:text-white dark:hover:bg-red-500"
                      onClick={handleLogOut}>
                      Log Out
                  </button>
                </>
              ) : null
            }
          </div>
        </div>
      </div>
    </div>
  );
};
