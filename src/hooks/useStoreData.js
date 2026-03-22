import { useSelector } from 'react-redux';

export const useStoreData = () => {
    const user = useSelector((state) => state?.auth?.user);

    const role = user?.role || '';
    const username = user?.first_name || user?.name || '';
    const email = user?.email || '';
    const token = user?.token || '';
    
    // Multi-role support
    const allUserPermissions = user?.all_user_permissions || [];
    const hasMultipleRoles = Array.isArray(allUserPermissions) && allUserPermissions.length > 1;
    const hasRole = (roleToCheck) => {
        if (!roleToCheck) return false;
        return allUserPermissions.includes(roleToCheck);
    };
    const canSwitchRole = hasMultipleRoles;

    return {
        user,
        role, // Current active role (backward compatible)
        username,
        email,
        token,
        // New multi-role properties
        allUserPermissions, // Array of all roles user has
        hasMultipleRoles, // Boolean: true if user has more than one role
        hasRole, // Function: check if user has a specific role
        canSwitchRole, // Boolean: true if user can switch roles
    };
};
