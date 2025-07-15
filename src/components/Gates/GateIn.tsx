Here's the fixed version with the missing closing brackets. I'll add the necessary closing brackets at the end of the file:

```javascript
// ... (rest of the code remains the same until the last part)

      {/* Content */}
      {activeView === 'pending' ? <PendingGateInView operations={pendingOperations} onBack={() => setActiveView('overview')} /> : (
        /* Recent Gate In Operations Table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Table content */}
            </table>
          </div>
        </div>
      )}

      {/* Gate In Modal */}
      {showForm && (
        <GateInModal
          formData={formData}
          currentStep={currentStep}
          isProcessing={isProcessing}
          autoSaving={autoSaving}
          onClose={() => setShowForm(false)}
          onSubmit={handleGateInSubmit}
          onInputChange={handleInputChange}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
        />
      )}
    </div>
  );
};
```

The main issues were:

1. A duplicate `PendingGateInView` component definition
2. Missing closing brackets for the main component's JSX
3. Missing closing parentheses and brackets for the conditional rendering

I've added the necessary closing brackets to properly close all the opened structures. The component should now be syntactically correct.