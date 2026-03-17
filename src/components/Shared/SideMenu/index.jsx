// Library imports
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Local imports
import { sideMenuRoutes } from '../../../routes/sideMenuConfig';
import { logo } from '../../../assets/images';
import { useStoreData } from '../../../hooks/useStoreData';

// Icons Imports
import { ArrowHeadIcon, CloseMenuIcon, MenuIcon } from '../../../assets/icons';
import { Settings } from '@mui/icons-material';

const SideMenu = ({ sideMenuOpen, setSideMenuOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { role } = useStoreData();

  const [childRoute, setChildRoute] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setSideMenuOpen(window.innerWidth >= 992);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className={`h-full absolute left-0 z-50 border-r border-style base:relative select-none bg-white justify-between transition-all duration-300 ${sideMenuOpen ? 'w-[250px]' : 'w-[65px]'} shadow-lg base:shadow-none`}
    >
      {/* Header */}
      <div className='flex items-center justify-between px-[11px] h-[70px] bg-white/80 border-b border-style'>
        <div className='flex items-center gap-3 overflow-hidden'>
          {sideMenuOpen && (
            <div className='flex items-center gap-2 h-10'>
              <img
                src={logo}
                alt='Logo'
                className='size-10'
              />
              <span className='text-[16px] font-semibold text-secondary-dark whitespace-nowrap tracking-wide'>
                Dr. Self Tape
              </span>
            </div>
          )}
        </div>
        <div
          className='text-secondary-dark text-sm font-bold cursor-pointer hover:text-primary transition-colors'
          onClick={() => setSideMenuOpen(!sideMenuOpen)}
        >
          <div className='pr-2'>
            {sideMenuOpen ? <CloseMenuIcon /> : <MenuIcon />}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className='overflow-y-auto flex pt-2 flex-col transition-all duration-300 gap-2 max-h-[calc(100dvh-7rem)] h-full'>
        {sideMenuRoutes(role)?.map((route, index) => {
          const isMainActive = currentPath.startsWith(route.path);
          const isChild = Array.isArray(route.child) && route.child.length > 0;
          const isExpanded = childRoute === route.path;

          return (
            <div key={index}>
              {/* Main route */}
              <div
                onClick={() => {
                  if (isChild) {
                    setChildRoute((prev) =>
                      prev === route.path ? null : route.path
                    );
                  } else {
                    navigate(route.path);
                  }
                }}
                className={`flex items-center justify-between mx-2 rounded px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-300 ${isMainActive
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-secondary/20 text-secondary-dark'
                  }`}
              >
                <div className='flex items-center gap-2'>
                  <div className='min-w-[20px]'>{route.icon}</div>
                  {sideMenuOpen && (
                    <span className='truncate font-medium'>{route.text}</span>
                  )}
                </div>

                {isChild && sideMenuOpen && (
                  <span
                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'
                      } text-secondary-dark`}
                  >
                    <ArrowHeadIcon width={12} height={12} />
                  </span>
                )}
              </div>

              {/* Child routes */}
              <div
                className={`transition-[max-height] duration-300 overflow-hidden ${isExpanded ? 'max-h-[999px]' : 'max-h-0'
                  }`}
              >
                {isChild && (
                  <div
                    className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${isExpanded ? 'max-h-[500px]' : 'max-h-0'
                      }`}
                  >
                    <div
                      className={`flex flex-col gap-1 ${sideMenuOpen ? 'pl-5' : 'pl-1.5'
                        } pt-2`}
                    >
                      {route.child.map((child, childIndex) => {
                        const isChildActive = currentPath.startsWith(child?.path);
                        return (
                          <div
                            key={childIndex}
                            onClick={() => navigate(child.path)}
                            className={`flex items-center mx-2 gap-2 px-2 py-1 rounded text-sm font-medium cursor-pointer transition ${isChildActive
                              ? 'bg-primary/20 text-primary'
                              : 'hover:bg-secondary/20 text-secondary-dark'
                              }`}
                          >
                            <span
                              className={`${!sideMenuOpen && 'w-full'
                                } text-[10px] text-center`}
                            >
                              {child?.childIcon}
                            </span>
                            {sideMenuOpen && (
                              <span className='truncate font-medium'>
                                {child.moduleName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4">
        <div
          className='group w-fit cursor-pointer flex items-center gap-3 hover:text-primary text-secondary-dark transition-colors duration-200'
          onClick={() => navigate('/settings')}
        >
          <span className="text-balck">
            <Settings
              className='!size-6 group-hover:!rotate-[90deg] !transition-all !duration-700 !ease-in-out'
            />
          </span>
          {sideMenuOpen && (
            <span className="truncate font-medium pt-1">Settings</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SideMenu;
