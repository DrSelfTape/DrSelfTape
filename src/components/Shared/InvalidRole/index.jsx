export const InvalidRole = () => {
  return (
    <div className="h-[calc(100vh-50px)] flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-md rounded-lg p-6 text-center max-w-md w-full">
        <h2 className="text-2xl font-semibold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-700 mb-4">
          You do not have the required role to view this page, or the role information is missing.
        </p>
        <button
          onClick={() => window.location.reload()}
          className=" bg-blue-600 text-white px-4 py-2  pb-3 rounded hover:bg-blue-700 transition cursor-pointer"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default InvalidRole;
