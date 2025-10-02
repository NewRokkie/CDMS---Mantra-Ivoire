@@ .. @@
   const handleCreateStack = () => {
     setSelectedStack(null);
     setShowStackForm(true);
   };
 
+  const handleEditStack = (stack: StackConfiguration) => {
+    setSelectedStack(stack);
+    setShowStackForm(true);
+  };
+
   const handleDeleteStack = async (stackId: string) => {
@@ .. @@
           <StackConfigurationTable
             stacks={filteredStacks}
             onDeleteStack={handleDeleteStack}
+            onEditStack={handleEditStack}
           />
         </div>